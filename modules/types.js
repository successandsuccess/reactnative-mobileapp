/**
 * @typedef {object} UserData
 * @property {string} id
 * @property {number} credit
 * @property {number} credit_on_hold
 * @property {string} email
 * @property {boolean} first_time
 * @property {boolean} accepted_terms
 * @property {string} picture
 * @property {string} preferred_name
 * @property {string} state
 * @property {string} street
 * @property {string} stripe_id
 * @property {Object} used_promo_list
 * @property {string} zipcode
 */

/**  
 * @type {UserData}
 */
export const defaultUserData = {
    id: "",
    credit: 0,
    credit_on_hold: 0,
    email: "",
    first_time: false,
    accepted_terms: false,
    picture: "",
    preferred_name: "",
    state: "",
    street: "",
    stripe_id: "",
    used_promo_list: "",
    zipcode: "",
}

/**
 * @typedef {object} SignupData
 * @property {string} email
 * @property {string} password
 * @property {string} confirmPassword
 * @property {string} preferredName
 * @property {string} street
 * @property {string} state
 * @property {string} zipcode
 */

/**
 * @typedef {object} AsyncUserData
 * @property {string} email
 * @property {string} userId
 * @property {string} preferredName
 * @property {string} street
 * @property {string} state
 * @property {string} zipcode
 * @property {string} user_type
 * @property {string} access_code
 */

export const Types = {}