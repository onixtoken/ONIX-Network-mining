# GitHub Issue

## Title: Server error: Received invalid response format in AuthContext.tsx

### Description:
Error occurring in AuthContext.tsx around line 106. The login function is throwing 'Server error: Received invalid response format' when the server response is not JSON. This happens during the login process when the API returns a non-JSON response. The error is caught at line 106 in the login function where it checks the content-type header.