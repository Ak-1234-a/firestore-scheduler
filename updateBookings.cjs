// updateBookings.js

const admin = require("firebase-admin");

const credentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(credentials),
});

const db = admin.firestore();

async function updateBookings() {
  const now = new Date();
  const bookingsSnapshot = await db.collection("bookings")

  const updates = [];

  bookingsSnapshot.forEach((doc) => {
    const data = doc.data();

    // Combine dropDate and dropTime (assumes format like '25/7/2025' and '3:08 PM')
    const [day, month, year] = data.dropDate.split("/");
    const dropDateTimeStr = `${year}-${month}-${day} ${data.dropTime}`;
    const dropDateTime = new Date(dropDateTimeStr);

    if (now > dropDateTime) {
      console.log(`Completing booking: ${doc.id}`);

      if (data.driverId) {
        updates.push(db.collection("drivers").doc(data.driverId).update({ isFree: true }));
      }

      if (data.vehicleId) {
        updates.push(db.collection("vehicles").doc(data.vehicleId).update({ isFree: true }));
      }
    }
  });

  await Promise.all(updates);
  console.log("Updated bookings and freed resources.");
}

updateBookings().catch(console.error);
