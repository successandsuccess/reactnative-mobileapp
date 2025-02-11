import { Auth } from 'aws-amplify';
import { API_BASE_URL, ENV } from '../../../constants'

export function updatePromoRef(change, incomingData) {
  updatePromoReference({ change: change, id: incomingData.id });

  async function updatePromoReference(dataToDynamo) {
    // const info = await Auth.currentUserInfo();
    let body = { ...dataToDynamo };

    // let token = null;
    // let prom = Auth.currentSession().then(
    //   info => (token = info.getIdToken().getJwtToken()),
    // );
    // await prom;
    const response = await fetch(
      `${API_BASE_URL}/${ENV}/promos/share`,
      {
        method: 'PATCH', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Authorization': 'none',
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(body), // body data type must match “Content-Type” header
      },
    );
    let apiResponse = await response.json(); // parses JSON response into native JavaScript objects
  }
}
