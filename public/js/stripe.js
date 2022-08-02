import axios from 'axios';
import { showAlert } from './alerts.js';
const stripe = Stripe(
  'pk_test_51LRkjVLARGILMDL8vLcxkO7xVx0eNhsMfMxZ3wJGE5BAyJp7MVxg1vSPdDzzZC6aGRkZjwgH9amNYZGMpmldtmZC00EzHJ3AYQ'
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get session from the server (our checkout implementation server-side)
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    console.log(session);
    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
