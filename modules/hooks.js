// @ts-check
import React, { useState, useEffect } from "react";
import { API_BASE_URL, ENV } from "../constants";
import { collectManifestSchemes, createURL } from "expo-linking";
import { presentPaymentSheet, useStripe } from "@stripe/stripe-react-native";
import { Auth } from "aws-amplify";
import { defaultUserData } from "./types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_EXPIRATION_TIME = 1000 * 60 * 15;       // 15 min cache
export const PROFILE_DATA_KEY = 'userProfileData';
const INTENT_DATA_KEY = 'paymentIntentData';

/**
 * @async
 * @template T
 * @param {Object} params 
 * @param {string} params.cacheKey
 * @param {number} [params.cacheTimeout = CACHE_EXPIRATION_TIME]
 * @param {() => Promise<T>} params.fetchCallback
 * @returns {Promise<T>}
 */
async function refreshCacheData({
    cacheKey,
    cacheTimeout=CACHE_EXPIRATION_TIME,
    fetchCallback,
}) {
    try {
        const {expiration, ...cacheData} = JSON.parse((await AsyncStorage.getItem(cacheKey)) ?? "{}")

        if (!expiration) throw new Error(`Cache has invalid expiration date [${expiration}]`);

        const expiredDuration = (Date.now() - parseInt(expiration))/1000
        if (expiredDuration > 0) {
            await AsyncStorage.removeItem(cacheKey)
            throw new Error(`Cache expired [${expiredDuration}]s ago`)
        }

        // if no error by now, we can use the cached data
        console.log(`Using cache for [${cacheKey}], still valid for [${-expiredDuration}]s\n${JSON.stringify(cacheData)}`)
        return cacheData
    } catch (err) {
        console.log(`[${err}]\nFetching data for [${cacheKey}]`)
        const apiResponse = await fetchCallback()

        apiResponse.expiration = Date.now() + cacheTimeout
        const cacheJson = JSON.stringify(apiResponse)
        console.log(`Updating cache data for [${cacheKey}]:`, cacheJson)
        AsyncStorage.setItem(cacheKey, cacheJson)

        return apiResponse;
    }
}

export async function invalidateCache(cacheKey) {
    let cacheData = {}
    try {
        cacheData = JSON.parse((await AsyncStorage.getItem(cacheKey)) ?? "{}")
    } catch (err) {
        console.error(err)
        return
    }

    cacheData.expiration = Date.now()
    const cacheJSON = JSON.stringify(cacheData)
    console.log(`Invalidating cache data for [${cacheKey}]`)
    AsyncStorage.setItem(cacheKey, cacheJSON)
}

/**
 * Utility function to initialize payment sheet and setup backend
 * - calls endpoint that invokes stripe setup payment + saves stripe id in DDB if needed
 * - initializes payment sheet with response intent data
 * 
 * @param {{customer: import('./types').UserData}} props
 */
export function useInitPaymentSheetPromise({customer}) {
    /**
     * @type {[Promise, React.Dispatch<React.SetStateAction<Promise>>]}
     */
    const [promise, setPromise] = useState(new Promise(() => {}))
    const { initPaymentSheet } = useStripe()

    useEffect(() => setPromise(initializePaymentSheet()), [])

    async function fetchPaymentIntentData() {
        console.log(`POST to payment/setup w/ body:\n${JSON.stringify({ customer }, undefined, 2)}`)

        const response = await fetch(`${API_BASE_URL}/${ENV}/payment/setup`,
            {
                method: 'POST', // *GET, POST, PUT, DELETE, etc.
                mode: 'cors', // no-cors, *cors, same-origin
                cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                credentials: 'same-origin', // include, *same-origin, omit
                headers: {
                    'Content-Type': 'application/json',
                    'Connection': 'keep-alive',
                },
                redirect: 'follow', // manual, *follow, error
                referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
                body: JSON.stringify({
                    customer
                }), // body data type must match “Content-Type” header
            },
        )
        if (!response.ok || response.status !== 200) throw new Error(`Encountered [${response.status}] while creating setup intent`)

        const apiResponseData = await response.json()

        console.log("response from payment/setup:\n", JSON.stringify(apiResponseData, undefined, 2))

        return apiResponseData;
    }

    async function initializePaymentSheet() {
        const {
            stripe_customer_id: customerId,
            ephemeral_key: customerEphemeralKeySecret,
            setup_intent: setupIntentClientSecret,
        } = await refreshCacheData({
            cacheKey: INTENT_DATA_KEY,
            fetchCallback: fetchPaymentIntentData,
        });

        const paymentSheetParams = {
            merchantDisplayName: "Dossiay",
            customerId,
            customerEphemeralKeySecret,
            setupIntentClientSecret,
            // Set `allowsDelayedPaymentMethods` to true if your business can handle payment
            //methods that complete payment after a delay, like SEPA Debit and Sofort.
            allowsDelayedPaymentMethods: false,
            returnURL: createURL("stripe-redirect"),
        }

        console.log("calling Stripe initPaymentSheet with params:\n", JSON.stringify(paymentSheetParams, undefined, 2))

        const { error } = await initPaymentSheet(paymentSheetParams);

        if (error) throw new Error(`Encountered err from Stripe initPaymentSheet: ${JSON.stringify(error, undefined, 2)}`);
    }

    return {
        setupPromise: promise,
        presentPaymentSheet
    };
}

/**
 * Utility function to refresh User Profile data
 * 
 * Eventually aiming to create a context for to replace the prop drilling that's
 * been going on in navigation params
 */
export function useUserProfileData() {
    const [userProfileData, setUserProfileData] = useState(defaultUserData)

    useEffect(() => {
        refreshUserProfileData();
    }, [])

    async function refreshUserProfileData() {
        const userData = await refreshCacheData({
            cacheKey: PROFILE_DATA_KEY,
            fetchCallback: fetchUserProfileData,
        })

        console.log("setting userProfileData to", JSON.stringify(userData))
        setUserProfileData(userData)
    }

    async function fetchUserProfileData() {
        const userInfo = await Auth.currentUserInfo()
        const {
            sub,
            email,
            email_verified,
            username,
            id,
        } = userInfo['attributes']

        // preferred_name, street, state, zipcode only used if subject not found in DB
        const body = JSON.stringify({
            incoming_id: sub,
            email: email,
            preferred_name: "",
            street: "",
            state: "",
            zipcode: "",
        })

        const token = await Auth.currentSession().then(cognitoSession => cognitoSession.getIdToken().getJwtToken())

        const response = await fetch(
            `${API_BASE_URL}/${ENV}/customer`,
            {
            method: "POST", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, *cors, same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",
                Connection: "keep-alive",
                Authorization: token,
            },
            redirect: "follow", // manual, *follow, error
            referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: body, // body data type must match “Content-Type” header
            }
        )

        const { user: userData } = await response.json()

        return userData
    }

    return { userProfileData, setUserProfileData, refreshUserProfileData }
}