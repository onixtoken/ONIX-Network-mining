        if (!isJSON(response)) {
            const errorDetails = `Error: Non-JSON response received with status ${response.status} - ${response.statusText}`;
            // Handle the error more gracefully, e.g., logging or setting an error state instead of throwing
            console.error(errorDetails);
            setError(errorDetails);
            return;
        }