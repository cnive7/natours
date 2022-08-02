//update data function
//call it from index.js
import { showAlert } from './alerts.js';
import axios from 'axios';
//type is either 'password' or 'data'
export const updateSettings = async function (type, data) {
  try {
    const apiUrl = '/api/v1/users/';
    const endUrl = type === 'password' ? 'updateMyPassword' : 'updateMe';
    const res = await axios.patch(apiUrl + endUrl, data);
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
