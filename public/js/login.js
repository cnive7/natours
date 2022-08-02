import axios from 'axios';
import { showAlert } from './alerts.js';
export const login = async function (email, password) {
  try {
    // const res = await axios({
    //   method: 'POST',
    //   url: '/api/v1/users/login',
    //   data: {
    //     email: email,
    //     password: password,
    //   },
    // });

    const res = await axios.post('/api/v1/users/login', {
      email: email,
      password: password,
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully');
      window.setTimeout(() => {
        location.assign('/');
      }, 1200);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios.get('/api/v1/users/logout');
    if (res.data.status === 'success') location.reload(true);
  } catch (err) {
    console.log(err.response);
    showAlert('error', 'Error logging out! Try again');
  }
};
