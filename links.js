// Create a white-labeled link for contractors/admins
function createWhiteLabeledLink(contractorId) {
  const linkRef = firebase.firestore().collection("links").doc();
  return linkRef.set({
    creatorId: contractorId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    linkId: linkRef.id,
  }).then(() => {
    console.log("White-labeled link created:", linkRef.id);
    return linkRef.id; // Return the link ID for further use
  }).catch((error) => {
    console.error("Error creating white-labeled link:", error);
    throw error;
  });
}

// Retrieve a white-labeled link by its ID
function getWhiteLabeledLink(linkId) {
  return firebase.firestore().collection("links").doc(linkId).get()
    .then((doc) => {
      if (doc.exists) {
        console.log("White-labeled link data:", doc.data());
        return doc.data();
      } else {
        console.error("No white-labeled link found for ID:", linkId);
        return null;
      }
    })
    .catch((error) => {
      console.error("Error retrieving white-labeled link:", error);
      throw error;
    });
}

// Validate a white-labeled link (e.g., check expiration or ownership)
function validateWhiteLabeledLink(linkId) {
  return getWhiteLabeledLink(linkId)
    .then((linkData) => {
      if (!linkData) {
        throw new Error("Invalid link");
      }
      // Example: Add expiration validation if needed
      // if (linkData.expiration && linkData.expiration.toDate() < new Date()) {
      //   throw new Error("Link has expired");
      // }
      return linkData;
    })
    .catch((error) => {
      console.error("Error validating white-labeled link:", error);
      throw error;
    });
}

export { createWhiteLabeledLink, getWhiteLabeledLink, validateWhiteLabeledLink };
