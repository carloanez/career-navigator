<?php
/** Plugin Name: IgniteCyber LinkedIn Account Linking */
if (!defined('ABSPATH')) exit;

function icn_linkedin_config() {
    $id = getenv('ICN_LINKEDIN_CLIENT_ID');
    $secret = getenv('ICN_LINKEDIN_CLIENT_SECRET');
    $enabled = getenv('ICN_LINKEDIN_LINKING');
    if ($enabled === false) {
        $file = getenv('ICN_LINKEDIN_CREDENTIALS_FILE') ?: '';
        $raw = $file && is_readable($file) ? file_get_contents($file, false, null, 0, 4096) : false;
        $credentials = $raw ? json_decode($raw, true) : null;
        $id = $credentials['client_id'] ?? null;
        $secret = $credentials['client_secret'] ?? null;
        $enabled = $credentials ? '1' : '0';
    }
    $callback = home_url('/career-navigator/linkedin/callback/');
    if ($enabled !== '1' || !is_string($id) || !$id || !is_string($secret) || !$secret ||
        wp_parse_url($callback, PHP_URL_SCHEME) !== 'https') return null;
    return ['client_id' => $id, 'client_secret' => $secret, 'redirect_uri' => $callback];
}

function icn_linkedin_table() {
    global $wpdb;
    return $wpdb->prefix.'ignite_career_linkedin';
}

function icn_linkedin_subject($user_id) {
    global $wpdb;
    $table = icn_linkedin_table();
    return $wpdb->get_var($wpdb->prepare("SELECT subject_hash FROM $table WHERE user_id=%d", $user_id));
}

function icn_linkedin_remove($user_id) {
    global $wpdb;
    return $wpdb->delete(icn_linkedin_table(), ['user_id' => $user_id], ['%d']);
}

function icn_linkedin_status() {
    return ['available' => icn_linkedin_config() !== null,
            'linked' => icn_student() && (bool)icn_linkedin_subject(get_current_user_id())];
}

function icn_linkedin_start() {
    $config = icn_linkedin_config();
    if (!$config) icn_error('LinkedIn connection is unavailable.', 503);
    if (icn_linkedin_subject(get_current_user_id())) icn_error('Disconnect your existing LinkedIn account first.', 409);
    icn_limit('linkedin-start-'.get_current_user_id(), 12, 10*MINUTE_IN_SECONDS);
    $state = bin2hex(random_bytes(32));
    // LinkedIn omits the optional nonce claim. Use single-use state bound to the student session.
    $attempt = ['user' => get_current_user_id(), 'session' => wp_hash(wp_get_session_token())];
    if (!set_transient('icn_li_'.$state, $attempt, 10*MINUTE_IN_SECONDS)) {
        icn_error('Could not start the LinkedIn connection. Try again.', 503);
    }
    $query = http_build_query([
        'response_type' => 'code', 'client_id' => $config['client_id'],
        'redirect_uri' => $config['redirect_uri'], 'scope' => 'openid profile',
        'state' => $state,
    ], '', '&', PHP_QUERY_RFC3986);
    icn_reply(['url' => 'https://www.linkedin.com/oauth/v2/authorization?'.$query]);
}

function icn_linkedin_json($response) {
    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) return null;
    $data = json_decode(wp_remote_retrieve_body($response), true);
    return is_array($data) ? $data : null;
}

function icn_linkedin_decode($value) {
    if (!is_string($value) || !preg_match('/\A[A-Za-z0-9_-]+\z/', $value)) return false;
    return base64_decode(strtr($value, '-_', '+/'), true);
}

function icn_linkedin_der($tag, $bytes) {
    $length = strlen($bytes);
    if ($length < 128) $size = chr($length);
    elseif ($length < 256) $size = "\x81".chr($length);
    else $size = "\x82".pack('n', $length);
    return chr($tag).$size.$bytes;
}

function icn_linkedin_rsa_key($jwk) {
    $modulus = icn_linkedin_decode($jwk['n'] ?? '');
    $exponent = icn_linkedin_decode($jwk['e'] ?? '');
    if (!$modulus || strlen($modulus) < 256 || strlen($modulus) > 1024 ||
        !$exponent || strlen($exponent) > 8) return null;
    $integer = static function ($bytes) {
        $bytes = ltrim($bytes, "\0");
        if ($bytes === '' || (ord($bytes[0]) & 128)) $bytes = "\0".$bytes;
        return icn_linkedin_der(2, $bytes);
    };
    $rsa = icn_linkedin_der(48, $integer($modulus).$integer($exponent));
    // SubjectPublicKeyInfo with the rsaEncryption algorithm identifier.
    $algorithm = hex2bin('300d06092a864886f70d0101010500');
    $spki = icn_linkedin_der(48, $algorithm.icn_linkedin_der(3, chr(0).$rsa));
    return "-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode($spki), 64, "\n").
        "-----END PUBLIC KEY-----\n";
}

function icn_linkedin_verify_id_token($token, $client_id, $nonce) {
    if (!function_exists('openssl_verify') || !is_string($token) || strlen($token) > 16384) return null;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $payload, $encoded_signature] = $parts;
    $meta = json_decode(icn_linkedin_decode($header) ?: '', true);
    $claims = json_decode(icn_linkedin_decode($payload) ?: '', true);
    $signature = icn_linkedin_decode($encoded_signature);
    if (($meta['alg'] ?? null) !== 'RS256' || !is_string($meta['kid'] ?? null) ||
        !$signature || !is_array($claims)) return null;

    $jwks = icn_linkedin_json(wp_remote_get('https://www.linkedin.com/oauth/openid/jwks', [
        'timeout' => 8, 'redirection' => 0, 'limit_response_size' => 65536,
    ]));
    $verified = false;
    foreach (($jwks['keys'] ?? []) as $jwk) {
        if (($jwk['kid'] ?? null) !== $meta['kid'] || ($jwk['kty'] ?? null) !== 'RSA') continue;
        $key = icn_linkedin_rsa_key($jwk);
        $verified = $key && openssl_verify($header.'.'.$payload, $signature, $key, OPENSSL_ALGO_SHA256) === 1;
        break;
    }
    $now = time();
    $audiences = (array)($claims['aud'] ?? []);
    if (!$verified || ($claims['iss'] ?? null) !== 'https://www.linkedin.com/oauth' ||
        !in_array($client_id, $audiences, true) ||
        ((count($audiences) !== 1 || isset($claims['azp'])) && ($claims['azp'] ?? null) !== $client_id) ||
        !is_int($claims['exp'] ?? null) || $claims['exp'] <= $now ||
        !is_int($claims['iat'] ?? null) || $claims['iat'] > $now + 60 ||
        $claims['iat'] < $now - 660 || ($claims['nonce'] ?? null) !== $nonce ||
        !is_string($claims['sub'] ?? null) || $claims['sub'] === '' || strlen($claims['sub']) > 255) return null;
    return $claims['sub'];
}

function icn_linkedin_finish($status) {
    wp_safe_redirect(home_url('/career-navigator/').'#linkedin='.$status, 303);
    exit;
}

function icn_linkedin_callback() {
    nocache_headers();
    header('Referrer-Policy: no-referrer');
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET' || !icn_student()) icn_linkedin_finish('expired');
    $config = icn_linkedin_config();
    $state = $_GET['state'] ?? '';
    if (!$config || !is_string($state) || !preg_match('/\A[a-f0-9]{64}\z/', $state)) icn_linkedin_finish('expired');
    $key = 'icn_li_'.$state;
    $attempt = get_transient($key);
    $user_id = get_current_user_id();
    if (!$attempt || $attempt['user'] !== $user_id ||
        !hash_equals($attempt['session'], wp_hash(wp_get_session_token())) ||
        !delete_transient($key)) icn_linkedin_finish('expired');
    if (isset($_GET['error'])) icn_linkedin_finish('cancelled');
    $code = $_GET['code'] ?? '';
    if (!is_string($code) || $code === '' || strlen($code) > 2048) icn_linkedin_finish('failed');

    $tokens = icn_linkedin_json(wp_remote_post('https://www.linkedin.com/oauth/v2/accessToken', [
        'timeout' => 10, 'redirection' => 0, 'limit_response_size' => 65536,
        'headers' => ['Content-Type' => 'application/x-www-form-urlencoded'],
        'body' => $config + ['grant_type' => 'authorization_code', 'code' => wp_unslash($code)],
    ]));
    $subject = icn_linkedin_verify_id_token($tokens['id_token'] ?? null, $config['client_id'], $attempt['nonce'] ?? null);
    if ($subject === null) icn_linkedin_finish('failed');
    if (!WP_Session_Tokens::get_instance($user_id)->verify(wp_get_session_token())) {
        icn_linkedin_finish('expired');
    }

    // Keep a comparison key only. No provider tokens or profile claims are persisted.
    $hash = hash('sha256', $config['client_id']."\0".$subject);
    global $wpdb;
    $table = icn_linkedin_table();
    $users = $wpdb->users;
    $meta = $wpdb->usermeta;
    $inserted = $wpdb->query($wpdb->prepare(
        "INSERT IGNORE INTO $table (user_id,subject_hash)
         SELECT ID,%s FROM $users WHERE ID=%d AND EXISTS
         (SELECT 1 FROM $meta WHERE user_id=ID AND meta_key='icn_verified' AND meta_value='1')",
        $hash, $user_id
    ));
    if ($inserted === false) icn_linkedin_finish('failed');
    icn_linkedin_finish(icn_linkedin_subject($user_id) === $hash ? 'linked' : 'conflict');
}

add_action('init', function () {
    $path = wp_parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    if ($path === '/career-navigator/linkedin/callback/') icn_linkedin_callback();
}, 19);
add_action('deleted_user', 'icn_linkedin_remove');
