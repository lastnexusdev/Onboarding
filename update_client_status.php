<?php
session_start();
require_once "auth_check.php";
include 'db.php';

header('Content-Type: application/json');

// Authentication check
if (!isset($_SESSION['userid'])) {
    echo json_encode(['success' => false, 'error' => 'Access denied.']);
    exit;
}

// Get POST data
$client_id = $_POST['client_id'] ?? null;
$status_field = $_POST['status_field'] ?? null;
$status_value = $_POST['status_value'] ?? null;

// Whitelist allowed column names to prevent SQL injection
$allowed_fields = ['Progress', 'Cancelled', 'Stalled', 'Completed', 'CompletedUntilNewVersion', 'ReadyToCall', 'RowColor'];

if ($client_id && $status_field && isset($status_value) && in_array($status_field, $allowed_fields)) {
    $update_sql = "UPDATE Onboarding SET `$status_field` = ? WHERE ClientID = ?";
    $stmt = $conn->prepare($update_sql);
    $stmt->bind_param('is', $status_value, $client_id);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Update failed.']);
    }
    $stmt->close();
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid parameters.']);
}

$conn->close();
?>
