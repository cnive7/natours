// This file is more to get data from the user interface and then delegate the action
// Everything related to user interface

import '@babel/polyfill';
import { displayMap } from './mapbox';
import { updateSettings } from './updateSettings';
import { login, logout, signup } from './login';
import { bookTour } from './stripe';
import { showAlert } from './alerts';

// DOM elements
const mapBox = document.querySelector('#map');
const loginForm = document.querySelector('.form--login');
const signupForm = document.querySelector('.form--signup');
const updateUserDataForm = document.querySelector('.form-user-data');
const updateUserPasswordForm = document.querySelector('.form-user-password');
const logOutBtn = document.querySelector('.nav__el--logout');
const bookBtn = document.getElementById('book-tour');

// Delegation
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    signup(name, email, password, passwordConfirm);
  });
}

if (updateUserDataForm)
  updateUserDataForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]); //since it's only one file we select 0
    updateSettings('data', form); //our axios will recognize the form as an object and it will work just the same
  });

if (updateUserPasswordForm)
  updateUserPasswordForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';
    const passwordOld = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings('password', {
      passwordOld,
      password,
      passwordConfirm,
    });
    document.querySelector('.btn--save-password').textContent = 'Save Password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (bookBtn)
  bookBtn.addEventListener('click', function (event) {
    event.target.textContent = 'Processing...';
    const { tourId } = event.target.dataset;
    bookTour(tourId);
  });

const alertMessage = document.querySelector('body').dataset.alert;
if (alertMessage) showAlert('success', alertMessage, 15);
