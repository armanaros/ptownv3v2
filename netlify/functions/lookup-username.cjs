const admin = require('./utils/firebase-admin.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { username } = JSON.parse(event.body || '{}');
    if (!username) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Username is required' }) };
    }

    const firestore = admin.firestore();
    const snap = await firestore.collection('users').where('username', '==', username).limit(1).get();

    if (snap.empty) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Username not found' }) };
    }

    const user = snap.docs[0].data();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    };
  } catch (err) {
    console.error('lookup-username error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
