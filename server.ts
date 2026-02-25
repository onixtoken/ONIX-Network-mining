// Original server.ts content with modifications

// Other existing code...

// Line 156 modification
response.send({ id: user.id, username: user.username }); // Sending only safe fields

// Other code...

// Line 186 modification
response.send({ id: user.id, username: user.username }); // Sending only safe fields

// Other existing code...