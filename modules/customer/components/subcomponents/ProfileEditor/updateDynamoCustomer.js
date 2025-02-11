import { Auth } from "aws-amplify";
import { API_BASE_URL, ENV } from "../../../../../constants";
import { invalidateCache, PROFILE_DATA_KEY } from "../../../../hooks";

/**
 *
 * @param {import('../../../../types').UserData} incomingData
 */
export async function updateDynamoCustomer(incomingData) {
  const body = {
    credit: incomingData.credit,
    credit_on_hold:
    incomingData.creditOnHold ?? incomingData.credit_on_hold ?? 0,
    incoming_id: incomingData.id,
    id: incomingData.id,
    email: incomingData.email,
    picture: incomingData.picture,
    preferred_name: incomingData.preferred_name,
    used_promo_list: incomingData.usedPromoList ?? incomingData.used_promo_list,
    username: incomingData.username,
    street: incomingData.street,
    state: incomingData.state,
    zipcode: incomingData.zipcode,
    first_time: incomingData.first_time,
    accepted_terms: incomingData.accepted_terms,
  };

  const session = await Auth.currentSession();
  const token = session.getIdToken().getJwtToken();
  const response = await fetch(`${API_BASE_URL}/${ENV}/customer`, {
    method: "PATCH", // *GET, POST, PUT, DELETE, etc.
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
    body: JSON.stringify(body), // body data type must match “Content-Type” header
  });
  if (!response.ok || response.status !== 200)
    throw new Error(
      `Encountered [${response.status}] while saving customer data to DDB`
    );
  const apiResponse = await response.json();

  // Invalidating cached savedProfile data
  await invalidateCache(PROFILE_DATA_KEY)

  console.log("PATCH customer response:\n", JSON.stringify(apiResponse, undefined, 2));
  return apiResponse;
}
