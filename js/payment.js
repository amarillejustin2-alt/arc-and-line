// PAYMENT LOGIC (placeholder, ready for a Philippine gateway such as PayMongo, Xendit or Maya)
//
// HOW TO CONNECT A GATEWAY LATER:
// 1. Create a Supabase Edge Function (e.g. "create-payment") that holds your SECRET key,
//    loads the order from the database, and asks the gateway for a checkout/payment link.
// 2. Call it from here:
//      const { data } = await supabase.functions.invoke('create-payment', { body: { orderId, method } });
//      location.href = data.checkout_url;   // customer pays on the gateway's page (card data never touches us)
// 3. Create a second Edge Function as a webhook. When the gateway confirms payment, it sets
//      orders.payment_status = 'paid' using the service-role key.
// Never put secret keys in this file. Never save card numbers anywhere.
export async function startPayment(orderId, method) {
  // For now: the order is saved as "pending payment" and the customer goes to their account.
  location.href = 'account.html?placed=' + orderId;
}
