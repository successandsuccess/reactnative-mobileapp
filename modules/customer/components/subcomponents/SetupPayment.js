import { Button } from "react-native-elements";
import { useInitPaymentSheetPromise } from "../../../hooks";
import { Alert } from "react-native";
import { Linking } from "react-native";

/**
 * 
 * @param {Object} props
 * @param {import("../../../types").UserData} props.profile
 * @returns 
 */
export function SetupPaymentButton({
    profile,
    buttonStyle = {},
    titleStyle = {},
    buttonTitle = '',
    isDisabled = false,
    promptConfirmation = false,
    preCallback = () => {},
    postCallback = () => {},
    finallyCallback = () => {},
}) {
    const {setupPromise, presentPaymentSheet} = useInitPaymentSheetPromise({customer: profile})

    /**
     * Promise wrapper for "skip payment method" Alert prompt to allow awaits
     *
     * @returns {Promise<boolean>}
     */
    function confirmPaymentSetupSkip() {
        return new Promise((resolve) => {
        Alert.alert(
            "Skip Payment Setup?",
            "Are you sure you want to skip payment set up?\n\nYou can always manage payment methods at a later time within your profile.",
            [
            {
                text: "Skip setup",
                onPress: () => resolve(true),
                style: "destructive"
            },
            {
                text: "Return",
                onPress: () => resolve(false),
                style: 'cancel'
            },
            ]
        );
        });
    }

    async function handleSubmit() {
        try {
            await preCallback()
            await setupPromise

            // presentPaymentSheet loop until
            // - successful payment method (no error)
            // - user skips setup (catch 'Canceled' error)
            // 
            // or unhandled error is encountered. Upon which
            // - user is prompted to contact support w/ Alert
            // - throw error to avoid running post callbacks
            while (true) {
                const { error } = await presentPaymentSheet()
                if (!error) break;
                if (error.code === 'Canceled' && !promptConfirmation) break;
                if (error.code === 'Canceled') {
                    const isConfirmedSkip = await confirmPaymentSetupSkip()
                    if (isConfirmedSkip) break;
                    continue;
                }
                throw new Error(`Encountered err from Stripe presentPaymentSheet: ${JSON.stringify(error, undefined, 2)}`);
            }

            await postCallback()
        }
        catch (err) {
            const {subject, body} = {
                subject: "SetupPayment client error",
                body: `For customer ${profile.id} on ${(new Date).toUTCString()}:\n\n${err}`
            }
            Alert.alert(
                "Error", 
                `Encountered unexpected error while setting payment method.\nPlease wait and try again\n\nIf you continue to experience issues, please contact support@dossiay.com with the button below. Relevant information will be pre-filled out`,
                [
                    {text: "Contact Support", onPress: () => Linking.openURL(`mailto:support@dossiay.com?subject=${subject}&body=${body}`)},
                    {text: "Cancel", style: 'cancel'}
                ]
            )
            console.error(err)
        }
        finally {
            finallyCallback()
        }
    }

    return (
        <Button
            buttonStyle={buttonStyle}
            titleStyle={titleStyle}
            title={buttonTitle}
            disabled={isDisabled}
            disabledStyle={[buttonStyle, { opacity: 0.8 }]}
            onPress={handleSubmit}
        />
    )
}