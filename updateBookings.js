const admin = require("firebase-admin");
const { DateTime } = require("luxon");

// Parse Firebase credentials from environment variable
const credentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(credentials),
});

const db = admin.firestore();

async function updateBookings() {
  // Current time in IST
  const nowIST = DateTime.now().setZone("Asia/Kolkata");

  // Fetch all bookings
  const bookingsSnapshot = await db.collection("bookings").get();

  const updates = [];

  bookingsSnapshot.forEach((doc) => {
    const data = doc.data();

    // Ensure dropDate and dropTime exist
    if (!data.dropDate || !data.dropTime) {
      console.warn(`Missing dropDate or dropTime in booking ${doc.id}`);
      return;
    }

    // Parse dropDate and dropTime in IST
    const dropDateTimeIST = DateTime.fromFormat(
      `${data.dropDate} ${data.dropTime}`,
      "d/M/yyyy h:mm a",
      { zone: "Asia/Kolkata" }
    );

    if (!dropDateTimeIST.isValid) {
      console.warn(
        `Invalid dropDateTime for booking ${doc.id}: ${dropDateTimeIST.invalidExplanation}`
      );
      return;
    }

    console.log(
      `Processing booking: ${doc.id}, dropDateTime: ${dropDateTimeIST.toISO()} | now: ${nowIST.toISO()}`
    );

    if (nowIST > dropDateTimeIST) {
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

      // Remove driverPhone and vehicleNumberPlate from the booking
      updates.push(
        db.collection("bookings").doc(doc.id).update({
          driverPhone: admin.firestore.FieldValue.delete(),
          vehicleNumberPlate: admin.firestore.FieldValue.delete(),
        })
      );
    }
  });

  await Promise.all(updates);
  console.log("Updated bookings and freed resources.");
}

updateBookings().catch(console.error);
