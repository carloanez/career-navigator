<?php
/** Plugin Name: IgniteCyber Career Navigator
 * Version: 0.3.0
 * Standalone local-first navigator and shared Academy header link.
 */
if (!defined('ABSPATH')) exit;
add_action('template_redirect', function () {
 if (!is_page('career-navigator')) return;
 $entry=WP_CONTENT_DIR.'/career-navigator/current/index.html';
 if (!is_readable($entry)) { status_header(503); echo 'Career Navigator is temporarily unavailable.'; exit; }
 status_header(200); nocache_headers(); header('Cache-Control: private, no-store, no-transform'); header('Content-Type: text/html; charset=UTF-8');
 $nonce=function_exists('icn_csp_nonce')?' nonce="'.esc_attr(icn_csp_nonce()).'"':'';
 $html=file_get_contents($entry);
 $turnstile=function_exists('icn_turnstile_config')?icn_turnstile_config():['required'=>false,'siteKey'=>''];
 $config='<script'.$nonce.'>window.CareerAccountConfig='.wp_json_encode(['endpoint'=>home_url('/career-navigator/?career_api='),
  'turnstile'=>['required'=>(bool)$turnstile['required'],
                 'siteKey'=>$turnstile['siteKey']]],JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT).';</script>';
 echo str_replace('</head>',$config.'<script'.$nonce.'>window.CareerNovaConfig=true;</script>'.'</head>',$html); exit;
}, 5);
add_filter('the_content', function ($html) {
 if (is_admin() || !is_main_query() || !is_page()) return $html;
 return preg_replace_callback('~<header\b[^>]*>.*?</header>~s', function ($header) {
  $es=str_starts_with(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/es/');
  $prefix=$es?'/es':'';
  $links=['training'=>$es?'Formación':'Training','learning-paths'=>$es?'Rutas de aprendizaje':'Learning paths','career-navigator'=>'Career Navigator','resources'=>$es?'Recursos gratuitos':'Free resources','events'=>$es?'Eventos':'Events','about'=>$es?'Acerca de':'About','for-teams'=>$es?'Para equipos':'For teams','contact'=>$es?'Contacto':'Contact'];
  $mobile='<div class="ignite-career-mobile-wrapper"><details class="ignite-mobile"><summary>'.($es?'Menú':'Menu').'</summary><nav aria-label="'.($es?'Navegación móvil':'Mobile navigation').'">';
  foreach($links as $route=>$label) $mobile.='<a href="'.($route==='career-navigator'?'':$prefix).'/'.$route.'/">'.$label.'</a>';
  $mobile.='<a href="/">English</a><a href="/es/">Español</a></nav></details></div>';
  $header[0]=preg_replace('~<div class="flex items-center lg:hidden">.*?</div>(?=</div></header>)~s',$mobile,$header[0]);
  return preg_replace_callback('~<a\b([^>]*?)href="(?:/es)?/learning-paths/"([^>]*)>.*?</a>~s', function ($a) {
   return $a[0].'<a'.$a[1].'href="/career-navigator/"'.$a[2].'>Career Navigator</a>';
  }, $header[0], 1);
 }, $html);
}, 99);
add_action('wp_head', function () {
 if (is_admin()) return;
 echo '<style id="ignite-career-navigation">header.sticky>div>nav{gap:10px}header.sticky>div>nav>a{white-space:nowrap}.ignite-career-mobile-wrapper{display:none}@media(max-width:1399px){header.sticky>div>nav,header.sticky>div>div.hidden{display:none!important}.ignite-career-mobile-wrapper{display:block!important}.ignite-career-mobile-wrapper .ignite-mobile{display:block}.ignite-career-mobile-wrapper summary{cursor:pointer;padding:.7rem;border:1px solid #526b7c;border-radius:6px;color:#f0f7fb}.ignite-career-mobile-wrapper nav{position:absolute;left:0;right:0;top:100%;display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:16px;background:#07111a;border-bottom:1px solid #526b7c;max-height:70vh;overflow:auto}.ignite-career-mobile-wrapper nav a{padding:10px;color:#f0f7fb}}</style>';
}, 99);
