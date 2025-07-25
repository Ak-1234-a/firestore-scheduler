// updateBookings.js

const admin = require("firebase-admin");

// Parse Firebase credentials from environment variable
const credentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(credentials),
});

const db = admin.firestore();

async function updateBookings() {
  const now = new Date();

  // Fix: fetch the actual snapshot with .get()
  const bookingsSnapshot = await db.collection("bookings").get();

  const updates = [];

  bookingsSnapshot.forEach((doc) => {
    const data = doc.data();

    // Ensure dropDate and dropTime exist
    if (!data.dropDate || !data.dropTime) {
      console.warn(`Missing dropDate or dropTime in booking ${doc.id}`);
      return;
    }

    // Parse date in format '25/7/2025' and time '3:08 PM'
    const [day, month, year] = data.dropDate.split("/");
    const dropDateTimeStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${data.dropTime}`;
    const dropDateTime = new Date(dropDateTimeStr);

    if (isNaN(dropDateTime.getTime())) {
      console.warn(`Invalid dropDateTime for booking ${doc.id}: ${dropDateTimeStr}`);
      return;
    }

    console.log(`Processing booking: ${doc.id}, dropDateTime: ${dropDateTime}`, `now: ${now}`);

    if (now > dropDateTime) {
      console.log(`Completing booking: ${doc.id}`);

      // Free the driver
      if (data.driverId) {
        updates.push(
          db.collection("drivers").doc(data.driverId).update({ isFree: true })
        );
      }

      // Free the vehicle
      if (data.vehicleId) {
        updates.push(
          db.collection("vehicles").doc(data.vehicleId).update({ isFree: true })
        );
      }
    }
  });

  await Promise.all(updates);
  console.log("Updated bookings and freed resources.");
}

updateBookings().catch(console.error);
