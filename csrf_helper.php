<?php
/**
 * CSRF Protection Helper
 * Include this file and use csrf_token_field() in forms,
 * and validate_csrf_token() on POST handlers.
 */

if (!isset($_SESSION)) {
    session_start();
}

function generate_csrf_token() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_token_field() {
    $token = generate_csrf_token();
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars($token) . '">';
}

function validate_csrf_token() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return true;
    }
    if (!isset($_POST['csrf_token']) || !isset($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $_POST['csrf_token']);
}
?>
