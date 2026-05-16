<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

api_method(['POST']);

function google_auth_debug_log(Throwable $exception): void
{
    $logFile = __DIR__ . '/../../logs/google-auth.log';
    $timestamp = date('Y-m-d H:i:s');
    $message = sprintf(
        "[%s] %s: %s%s",
        $timestamp,
        $exception::class,
        $exception->getMessage(),
        PHP_EOL
    );

    error_log($message, 3, $logFile);
}

$data = api_input();
$code = trim((string) ($data['code'] ?? ''));
$state = trim((string) ($data['state'] ?? ''));
$idToken = trim((string) ($data['idToken'] ?? $data['credential'] ?? ''));
$accessToken = trim((string) ($data['accessToken'] ?? ''));
$isGoogleFormPost = $idToken !== '' && isset($_POST['credential']);

function google_login_redirect(string $message): void
{
    $redirect = append_query_param_to_url(google_oauth_post_login_redirect(), 'auth', $message);
    header('Location: ' . $redirect);
    exit;
}

if ($code === '' && $idToken === '' && $accessToken === '') {
    api_response([
        'ok' => false,
        'message' => 'Google sign-in token is missing.',
    ], 422);
}

try {
    if ($idToken !== '') {
        $profile = google_oauth_fetch_id_token_profile($idToken);
    } elseif ($code !== '') {
        $requestedWith = trim((string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? ''));

        if (strcasecmp($requestedWith, 'XMLHttpRequest') !== 0) {
            api_response([
                'ok' => false,
                'message' => 'Invalid Google sign-in request.',
            ], 400);
        }

        $expectedState = trim((string) ($_SESSION['google_oauth_state'] ?? ''));

        if ($expectedState !== '') {
            if ($state === '' || !hash_equals($expectedState, $state)) {
                unset($_SESSION['google_oauth_state'], $_SESSION['google_oauth_started_at']);

                api_response([
                    'ok' => false,
                    'message' => 'Google sign-in could not be verified.',
                ], 422);
            }

            unset($_SESSION['google_oauth_state'], $_SESSION['google_oauth_started_at']);
        }

        $tokenResponse = google_oauth_exchange_code($code);
        $accessToken = trim((string) ($tokenResponse['access_token'] ?? ''));

        if ($accessToken === '') {
            throw new RuntimeException('Google did not return an access token.');
        }

        $profile = google_oauth_fetch_userinfo($accessToken);
    } else {
        $profile = google_oauth_fetch_userinfo($accessToken);
    }

    $user = login_user_from_google_profile($profile);
    login_user($user);
} catch (InvalidArgumentException $exception) {
    if ($isGoogleFormPost) {
        google_login_redirect('google_failed');
    }

    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (RuntimeException $exception) {
    google_auth_debug_log($exception);

    if ($isGoogleFormPost) {
        google_login_redirect('google_failed');
    }

    api_response([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 502);
} catch (Throwable $exception) {
    google_auth_debug_log($exception);

    if ($isGoogleFormPost) {
        google_login_redirect('google_failed');
    }

    api_response([
        'ok' => false,
        'message' => $exception->getMessage() !== '' ? $exception->getMessage() : 'Google sign-in failed. Please try again.',
    ], 500);
}

if ($isGoogleFormPost) {
    google_login_redirect('google_success');
}

api_response([
    'ok' => true,
    'message' => 'Signed in with Google.',
    'csrfToken' => csrf_token(),
    'user' => api_user_payload(current_user()),
]);
