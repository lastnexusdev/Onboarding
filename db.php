<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/app_error.log');

$servername = getenv('DB_HOST') ?: "localhost";
$username = getenv('DB_USER') ?: "admin";
$password = getenv('DB_PASS') ?: "XTelvista368!1985X";
$dbname = getenv('DB_NAME') ?: "onboarding";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    error_log("Connection failed: " . $conn->connect_error);
    die("A database connection error occurred. Please contact the administrator.");
}

// Function to log SQL errors
function log_sql_error($stmt) {
    $error = $stmt->error;
    $sqlstate = $stmt->sqlstate;
    error_log("SQL error: $error, SQLSTATE: $sqlstate");
}

?>
