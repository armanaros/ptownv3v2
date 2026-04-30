const admin = require('./utils/firebase-admin.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const authHeader = event.headers.authorization || '';
    const idToken = authHeader.replace('Bearer ', '');
    if (!idToken) {
      return { statusCode: 401, body: JSON.stringify({ error: 'No auth token provided' }) };
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const firestore = admin.firestore();

    const callerDoc = await firestore.collection('users').doc(decoded.uid).get();
    if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) };
    }

    const { username, email, password, role, firstName, lastName, phone, address, dailyRate, department } = JSON.parse(event.body || '{}');

    if (!username || !email || !password || !role) {
      return { statusCode: 400, body: JSON.stringify({ error: 'username, email, password, and role are required' }) };
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName || ''} ${lastName || ''}`.trim(),
    });

    await firestore.collection('users').doc(userRecord.uid).set({
      username,
      email,
      role,
      firstName: firstName || '',
      lastName: lastName || '',
      phone: phone || '',
      address: address || '',
      dailyRate: dailyRate || 0,
      department: department || '',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, uid: userRecord.uid, email }),
    };
  } catch (err) {
    console.error('create-user error:', err);
    const message = err.code === 'auth/email-already-exists' ? 'Email already in use' : err.message || 'Internal server error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
