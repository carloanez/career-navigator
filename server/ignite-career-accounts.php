<?php
/** Plugin Name: IgniteCyber Student Workspaces
 * Version: 0.3.0
 * Private student workspaces and consent-based beta feedback.
 */
if (!defined('ABSPATH')) exit;
if (is_readable(__DIR__.'/ignite-career-linkedin.php')) require_once __DIR__.'/ignite-career-linkedin.php';
function icn_nova_chat_table() { global $wpdb; return $wpdb->prefix.'ignite_nova_chats'; }
function icn_tables() { global $wpdb; return [$wpdb->prefix.'ignite_career_workspaces',$wpdb->prefix.'ignite_career_feedback']; }
add_action('init', function () {
 if (get_option('icn_schema_version') === '4') return;
 global $wpdb;
 require_once ABSPATH.'wp-admin/includes/upgrade.php';
 [$work,$feedback]=icn_tables(); $collate=$wpdb->get_charset_collate();
 dbDelta("CREATE TABLE $work (user_id bigint(20) unsigned NOT NULL, revision bigint(20) unsigned NOT NULL DEFAULT 0, payload longtext NOT NULL, updated_at datetime NOT NULL, PRIMARY KEY  (user_id)) $collate;");
 dbDelta("CREATE TABLE $feedback (id bigint(20) unsigned NOT NULL AUTO_INCREMENT, user_id bigint(20) unsigned NOT NULL, client_id varchar(100) NOT NULL, payload text NOT NULL, status varchar(20) NOT NULL DEFAULT 'open', created_at datetime NOT NULL, PRIMARY KEY  (id), UNIQUE KEY student_item (user_id,client_id)) $collate;");
 if (!function_exists('icn_linkedin_table')) return;
 $links=icn_linkedin_table();
 dbDelta("CREATE TABLE $links (
 user_id bigint(20) unsigned NOT NULL,
 subject_hash char(64) NOT NULL,
 PRIMARY KEY  (user_id),
 UNIQUE KEY subject_hash (subject_hash)
 ) $collate;");
 if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s',$wpdb->esc_like($links)))!==$links) return;
 $limits=icn_limit_table();
 dbDelta("CREATE TABLE $limits (
 bucket char(64) NOT NULL,
 hits int unsigned NOT NULL,
 expires_at bigint unsigned NOT NULL,
 PRIMARY KEY  (bucket),
 KEY expires_at (expires_at)
 ) $collate;");
 if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s',$wpdb->esc_like($limits)))!==$limits) return;
 $chats=icn_nova_chat_table();
 dbDelta("CREATE TABLE $chats (
 user_id bigint(20) unsigned NOT NULL,
 revision bigint(20) unsigned NOT NULL DEFAULT 0,
 payload longtext NOT NULL,
 PRIMARY KEY  (user_id)
 ) $collate;");
 if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s',$wpdb->esc_like($chats)))!==$chats) return;
 add_role('ignite_student','IgniteCyber student',['read'=>true,'access_career_navigator'=>true]);
 update_option('icn_schema_version','4',false);
}, 1);
function icn_student($u=null) { $u=$u ?: wp_get_current_user(); return $u->exists() && in_array('ignite_student',$u->roles,true) && (bool)get_user_meta($u->ID,'icn_verified',true); }
function icn_reply($data,$status=200) { status_header($status); header('Content-Type: application/json; charset=UTF-8'); header('Cache-Control: private, no-store, no-transform'); header('X-Content-Type-Options: nosniff'); header('Vary: Cookie, Origin'); echo wp_json_encode($data); exit; }
function icn_error($message,$status=400) { icn_reply(['error'=>$message],$status); }
function icn_limit_table() { global $wpdb; return $wpdb->prefix.'ignite_career_limits'; }
function icn_take_slot($bucket,$max,$seconds,$peer) {
 global $wpdb;
 // Apache normalizes REMOTE_ADDR for requests from the trusted tunnel.
 $key=hash_hmac('sha256',$bucket.'|'.$peer,wp_salt('nonce'));
 $table=icn_limit_table();
 $now=time();
 // InnoDB locks the row during this conditional upsert. A full bucket makes no changes.
 $changed=$wpdb->query($wpdb->prepare(
  "INSERT INTO $table (bucket,hits,expires_at) VALUES (%s,1,%d)
   ON DUPLICATE KEY UPDATE
   hits=IF(expires_at<=%d,1,IF(hits<%d,hits+1,hits)),
   expires_at=IF(expires_at<=%d,%d,expires_at)",
  $key,$now+$seconds,$now,$max,$now,$now+$seconds
 ));
 if($changed===false) icn_error('Account service is temporarily unavailable.',503);
 if($changed===0) return false;
 if(wp_rand(1,100)===1) $wpdb->query($wpdb->prepare("DELETE FROM $table WHERE expires_at<=%d LIMIT 1000",$now));
 return true;
}
function icn_limit($bucket,$max,$seconds) {
 if(!icn_take_slot($bucket,$max,$seconds,$_SERVER['REMOTE_ADDR']??'unknown')) {
  if($bucket==='email') error_log('career-abuse event=account_email_throttled');
  icn_error('Please wait before trying again.',429);
 }
}
function icn_turnstile_config() {
 static $config;
 if(isset($config)) return $config;
 $mode=getenv('ICN_TURNSTILE_REQUIRED');
 $site=getenv('ICN_TURNSTILE_SITE_KEY');
 $secret=getenv('ICN_TURNSTILE_SECRET_KEY');
 $file=getenv('ICN_TURNSTILE_CREDENTIALS_FILE')?:'';
 $installed=$file!==''&&is_file($file);
 if($installed && !$site && !$secret && is_readable($file)) {
  $keys=json_decode((string)file_get_contents($file,false,null,0,4096),true);
  $site=$keys['site_key']??'';
  $secret=$keys['secret_key']??'';
 }
 return $config=['required'=>$mode==='1'||$installed||$site||$secret,
                 'siteKey'=>is_string($site)?$site:'','secret'=>is_string($secret)?$secret:''];
}
function icn_verify_turnstile($token,$action) {
 $config=icn_turnstile_config();
 if(!$config['required']) return;
 $secret=$config['secret'];
 if(!$secret || !$config['siteKey']) icn_error('Account verification is temporarily unavailable.',503);
 if(!is_string($token) || $token==='' || strlen($token)>2048) icn_error('Complete the security check and try again.',400);
 $response=wp_remote_post('https://challenges.cloudflare.com/turnstile/v0/siteverify',[
  'timeout'=>6,'redirection'=>0,'limit_response_size'=>8192,
  'body'=>['secret'=>$secret,'response'=>$token],
 ]);
 if(is_wp_error($response) || wp_remote_retrieve_response_code($response)!==200) icn_error('Account verification is temporarily unavailable. Try again.',503);
 $verification=json_decode(wp_remote_retrieve_body($response),true);
 if(!is_array($verification) || !is_bool($verification['success']??null)) icn_error('Account verification is temporarily unavailable. Try again.',503);
 $hostname=wp_parse_url(home_url(),PHP_URL_HOST);
 if(!$verification['success'] || ($verification['hostname']??null)!==$hostname || ($verification['action']??null)!==$action) {
  icn_error('The security check expired or failed. Complete it again.',400);
 }
}
function icn_email_key($u) {
 $key=get_password_reset_key($u); if(is_wp_error($key)) return false;
 // Fragment keeps the reset secret out of server request logs and Referer headers.
 $url=home_url('/career-navigator/').'#account-reset='.rawurlencode($key).'&login='.rawurlencode($u->user_login);
 return wp_mail($u->user_email,'Your IgniteCyber Academy student account',"Set or reset your student password using this private link:\n\n".$url."\n\nThis link expires after 24 hours. If you did not request this, ignore this email.\nYour private learning workspace is stored by IgniteCyber Academy when you sign in and enable account saving.");
}
function icn_user_info() { $u=wp_get_current_user();return ['id'=>$u->ID,'email'=>$u->user_email,'name'=>$u->display_name]; }
function icn_workspace() {
 global $wpdb; [$work]=icn_tables(); $id=get_current_user_id();
 $wpdb->query($wpdb->prepare("INSERT IGNORE INTO $work (user_id,revision,payload,updated_at) VALUES (%d,0,'',%s)",$id,current_time('mysql',true)));
 $row=$wpdb->get_row($wpdb->prepare("SELECT revision,payload,updated_at FROM $work WHERE user_id=%d",$id),ARRAY_A);
 if(!$row) icn_error('Workspace storage is unavailable.',503);
 return ['revision'=>(int)$row['revision'],'workspace'=>$row['payload']!==''?json_decode($row['payload']):null,'updatedAt'=>$row['updated_at']];
}
function icn_validate_workspace($v) {
 // Private JSON is never rendered by PHP. Reject unknown top-level fields and bound collection sizes.
 $keys=['schemaVersion','catalogVersion','name','hours','budget','domain','target','ratings','answers','completed','evidence','owned','history','assessedAt','demo','careerTools'];
 if(!is_array($v)||array_diff(array_keys($v),$keys)||($v['schemaVersion']??0)!==1) return false;
 foreach(['name','budget','domain','target'] as $k) if(!isset($v[$k])||!is_string($v[$k])||strlen($v[$k])>240) return false;
 if(!is_int($v['hours']??null)||$v['hours']<1||$v['hours']>40||!is_bool($v['demo']??null)) return false;
 foreach(['ratings'=>100,'answers'=>200,'completed'=>100,'evidence'=>200,'owned'=>100,'history'=>50] as $k=>$max) if(!isset($v[$k])||!is_array($v[$k])||count($v[$k])>$max) return false;
 return is_array($v['careerTools']??null) && ($v['careerTools']['version']??0)===1;
}
function icn_nova_chat($action,$data) {
 global $wpdb;
 $table=icn_nova_chat_table();
 $id=get_current_user_id();
 if($action==='nova-chat-get') {
  $row=$wpdb->get_row($wpdb->prepare("SELECT revision,payload FROM $table WHERE user_id=%d",$id),ARRAY_A);
  if($wpdb->last_error)icn_error('Saved Nova chats are temporarily unavailable.',503);
  icn_reply(['revision'=>(int)($row['revision']??0),'chat'=>empty($row['revision'])?null:json_decode($row['payload'],true)]);
 }
 $revision=$data['revision']??null;
 $chat=$data['chat']??null;
 if(!is_int($revision)||$revision<0||!is_array($chat)||!array_is_list($chat)||count($chat)>40||count($chat)%2) {
  icn_error('This Nova conversation could not be saved.');
 }
 foreach($chat as $i=>$message) {
  if(!is_array($message)||array_diff(array_keys($message),['role','content'])||
     ($message['role']??null)!==($i%2?'assistant':'user')||!is_string($message['content']??null)||
     mb_strlen($message['content'])>($i%2?6000:2000)||trim($message['content'])==='') {
   icn_error('This Nova conversation could not be saved.');
  }
 }
 $payload=wp_json_encode($chat,JSON_UNESCAPED_UNICODE);
 $started=$wpdb->query($wpdb->prepare("INSERT IGNORE INTO $table (user_id,revision,payload)
  SELECT ID,0,'[]' FROM {$wpdb->users} WHERE ID=%d",$id));
 if($started===false)icn_error('Saved Nova chats are temporarily unavailable.',503);
 $saved=$wpdb->query($wpdb->prepare("UPDATE $table SET payload=%s,revision=revision+1
  WHERE user_id=%d AND revision=%d",$payload,$id,$revision));
 if($saved===false)icn_error('Saved Nova chats are temporarily unavailable.',503);
 if($saved!==1)icn_reply(['error'=>'Another device updated this Nova chat. Load the account version to continue.'],409);
 icn_reply(['revision'=>$revision+1]);
}
add_action('init', function () {
 $path=wp_parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH);
 if($path!=='/career-navigator/' || !isset($_GET['career_api'])) return;
 $action=sanitize_key($_GET['career_api']); $method=$_SERVER['REQUEST_METHOD']??'GET';
 if($action==='session' && $method==='GET') {
  icn_reply(['user'=>icn_student()?icn_user_info():null,'nonce'=>wp_create_nonce('icn_account'),'available'=>true]);
 }
 if($method!=='POST') icn_error('Use POST for this action.',405);
 $origin=$_SERVER['HTTP_ORIGIN']??'';
 if($origin!==rtrim(home_url(),'/')) icn_error('Request origin is not allowed.',403);
 if(stripos($_SERVER['CONTENT_TYPE']??'','application/json')!==0) icn_error('JSON is required.',415);
 if(!wp_verify_nonce($_SERVER['HTTP_X_ICN_NONCE']??'','icn_account')) icn_error('Your session changed. Reload and try again.',403);
 if((int)($_SERVER['CONTENT_LENGTH']??0)>1572864) icn_error('Workspace is too large. Export a backup and reduce its size.',413);
 $raw=file_get_contents('php://input',false,null,0,1572865);if(strlen($raw)>1572864)icn_error('Request too large.',413);
 $data=json_decode($raw,true,32);if(!is_array($data)) icn_error('Invalid JSON.');
 foreach(['email','password','key','login'] as $field) if(isset($data[$field]) && (!is_string($data[$field]) || strlen($data[$field])>320))icn_error('Invalid account field.');
 if($action==='register' || $action==='recover') {
  icn_limit('email',60,15*MINUTE_IN_SECONDS);
  $email=sanitize_email($data['email']??'');if(!is_email($email))icn_error('Enter a valid email address.');
  if($action==='register' && empty($data['consent']))icn_error('Please accept the student account notice.');
  icn_verify_turnstile($data['turnstileToken']??null,$action);
  $u=get_user_by('email',$email);
  if(!$u && $action==='register') {
   $id=wp_insert_user(['user_login'=>'student_'.wp_generate_password(20,false),'user_email'=>$email,'user_pass'=>wp_generate_password(48,true,true),'display_name'=>'Student','role'=>'ignite_student']);
   if(is_wp_error($id))icn_error('Account setup is temporarily unavailable. Please try again.',503);
   update_user_meta($id,'icn_consent_at',gmdate('c'));$u=get_user_by('id',$id);
  }
  if($u && in_array('ignite_student',$u->roles,true)) {
   if(icn_take_slot('mail-recipient-'.strtolower($email),1,MINUTE_IN_SECONDS,'global')) {
    if(!icn_email_key($u)) error_log('career-abuse event=account_email_delivery_failed');
   }
  }
  icn_reply(['message'=>'If a student account can be set up or recovered for this address, a private password link has been sent. Check your inbox and spam folder.']);
 }
 if($action==='reset-password') {
  icn_limit('reset',20,15*MINUTE_IN_SECONDS);
  $password=$data['password']??'';if(!is_string($password)||strlen($password)<12||strlen($password)>128)icn_error('Choose a password of 12–128 characters.');
  $u=check_password_reset_key($data['key']??'',$data['login']??'');
  if(is_wp_error($u)||!in_array('ignite_student',$u->roles,true))icn_error('This link is invalid or expired. Request another password link.');
  reset_password($u,$password);update_user_meta($u->ID,'icn_verified',1);
  icn_reply(['message'=>'Password saved and email verified. You can now sign in.']);
 }
 if($action==='login') {
  icn_limit('login-global',200,15*MINUTE_IN_SECONDS);
  icn_limit('login-'.hash('sha256',strtolower((string)($data['email']??''))),15,15*MINUTE_IN_SECONDS);
  $email=sanitize_email($data['email']??'');$u=get_user_by('email',$email);
  if(!$u || !icn_student($u))icn_error('Sign-in failed. Check your details and verify your email first.',401);
  $u=wp_signon(['user_login'=>$u->user_login,'user_password'=>(string)($data['password']??''),'remember'=>!empty($data['remember'])],true);
  if(is_wp_error($u))icn_error('Sign-in failed. Check your details and verify your email first.',401);
  wp_set_current_user($u->ID);icn_reply(['user'=>icn_user_info(),'nonce'=>wp_create_nonce('icn_account')]);
 }
 if(!icn_student())icn_error('Sign in with a verified student account.',401);
 if($action==='linkedin-status' && function_exists('icn_linkedin_status')) icn_reply(icn_linkedin_status());
 if($action==='linkedin-start' && function_exists('icn_linkedin_start')) icn_linkedin_start();
 if($action==='linkedin-disconnect' && function_exists('icn_linkedin_remove')) {
  if(icn_linkedin_remove(get_current_user_id())===false) icn_error('Could not disconnect LinkedIn. Try again.',503);
  icn_reply(icn_linkedin_status());
 }
 if($action==='logout') { wp_logout();icn_reply(['message'=>'Signed out.']); }
 if($action==='nova-chat-get'||$action==='nova-chat-save')icn_nova_chat($action,$data);
 if($action==='workspace-get')icn_reply(icn_workspace());
 if($action==='workspace-save' || $action==='workspace-delete') {
  global $wpdb;[$work]=icn_tables();$current=icn_workspace();
  if(!is_int($data['revision']??null))icn_error('A workspace revision is required.');
  if($action==='workspace-save' && !icn_validate_workspace($data['workspace']??null))icn_error('This workspace format is not supported.');
  $payload=$action==='workspace-delete'?'':wp_json_encode(json_decode($raw)->workspace,JSON_UNESCAPED_UNICODE);
  $changed=$wpdb->query($wpdb->prepare("UPDATE $work SET payload=%s,revision=revision+1,updated_at=%s WHERE user_id=%d AND revision=%d",$payload,current_time('mysql',true),get_current_user_id(),$data['revision']));
  if($changed===false)icn_error('Saving is temporarily unavailable.',503);
  if($changed!==1)icn_reply(['error'=>'Another device saved a newer version. Choose which version to keep.','conflict'=>true],409);
  icn_reply(['revision'=>$data['revision']+1,'updatedAt'=>gmdate('c')]);
 }
 if($action==='feedback-list') {
  global $wpdb;[, $table]=icn_tables();
  icn_reply(['items'=>$wpdb->get_results($wpdb->prepare("SELECT client_id AS clientId,status,created_at AS createdAt FROM $table WHERE user_id=%d ORDER BY id DESC LIMIT 200",get_current_user_id()),ARRAY_A)]);
 }
 if($action==='feedback-submit') {
  icn_limit('feedback-'.get_current_user_id(),40,HOUR_IN_SECONDS);
  if(empty($data['consent']))icn_error('Please confirm you want to share this feedback.');
  $item=$data['item']??[];$clean=[];
  foreach(['id'=>100,'summary'=>140,'details'=>2000,'expected'=>1000,'area'=>80,'kind'=>80,'role'=>100,'route'=>40,'version'=>30] as $k=>$max) {
   if(!is_string($item[$k]??null)||mb_strlen($item[$k])>$max)icn_error('Invalid feedback field: '.$k);
   $clean[$k]=sanitize_textarea_field($item[$k]);
  }
  if(!$clean['id']||!trim($clean['summary'])||!trim($clean['details']))icn_error('Feedback needs a summary and details.');
  $clean['rating']=max(0,min(5,(int)($item['rating']??0)));
  global $wpdb;[, $table]=icn_tables();
  $exists=$wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE user_id=%d AND client_id=%s",get_current_user_id(),$clean['id']));
  if(!$exists) {
   $ok=$wpdb->insert($table,['user_id'=>get_current_user_id(),'client_id'=>$clean['id'],'payload'=>wp_json_encode($clean),'status'=>'open','created_at'=>current_time('mysql',true)]);
   if(!$ok)icn_error('Feedback could not be saved. Please retry.',503);
  }
  icn_reply(['message'=>'Feedback sent to IgniteCyber Academy.','clientId'=>$clean['id']]);
 }
 if($action==='delete-account') {
  $u=wp_get_current_user();if(!wp_check_password((string)($data['password']??''),$u->user_pass,$u->ID))icn_error('Enter your current password to delete this account.',401);
  global $wpdb;[$work,$feedback]=icn_tables();$wpdb->delete($work,['user_id'=>$u->ID]);$wpdb->delete($feedback,['user_id'=>$u->ID]);
  require_once ABSPATH.'wp-admin/includes/user.php';if(!wp_delete_user($u->ID))icn_error('Account deletion could not finish. Please contact the Academy.',503);wp_logout();icn_reply(['message'=>'Your student account, workspace, Nova chat and submitted feedback have been deleted from the active site.']);
 }
 icn_error('Unknown account action.',404);
}, 20);
// Subscribers cannot enter the editing dashboard even through the private editor gateway.
add_action('admin_init',function(){if(in_array('ignite_student',wp_get_current_user()->roles,true)&&!wp_doing_ajax()){wp_safe_redirect(home_url('/career-navigator/'));exit;}});
add_filter('show_admin_bar',function($show){return in_array('ignite_student',wp_get_current_user()->roles,true)?false:$show;});
add_action('delete_user',function($id){global $wpdb;[$work,$feedback]=icn_tables();$wpdb->delete($work,['user_id'=>$id]);$wpdb->delete($feedback,['user_id'=>$id]);});
add_action('deleted_user',function($id){global $wpdb;$wpdb->delete(icn_nova_chat_table(),['user_id'=>$id]);});
// Dashboard is available only through the existing private Academy editor gateway.
add_action('admin_menu',function(){add_menu_page('Career beta feedback','Career feedback','manage_options','ignite-career-feedback','icn_admin_feedback','dashicons-feedback',26);});
function icn_admin_feedback(){
 if(!current_user_can('manage_options'))wp_die('Not authorized.');global $wpdb;[, $table]=icn_tables();
 if($_SERVER['REQUEST_METHOD']==='POST'){
  check_admin_referer('icn_feedback_admin');$status=sanitize_key($_POST['status']??'');
  if(in_array($status,['open','reviewing','resolved'],true))$wpdb->update($table,['status'=>$status],['id'=>absint($_POST['feedback_id']??0)]);
 }
 $rows=$wpdb->get_results("SELECT * FROM $table ORDER BY id DESC LIMIT 200",ARRAY_A);
 echo '<div class="wrap"><h1>Career Navigator beta feedback</h1><p>Latest 200 student submissions. Private workspaces and résumés are not included here.</p><table class="widefat striped"><thead><tr><th>Received / student</th><th>Feedback</th><th>Status</th></tr></thead><tbody>';
 foreach($rows as $r){$d=json_decode($r['payload'],true);$u=get_userdata($r['user_id']);
  echo '<tr><td>'.esc_html($r['created_at'].' UTC').'<br>'.esc_html($u?$u->user_email:'Deleted student').'</td><td><strong>'.esc_html($d['summary']).'</strong><p>'.nl2br(esc_html($d['details'])).'</p><p>Expected: '.esc_html($d['expected']).'</p><small>'.esc_html($d['area'].' · '.$d['kind'].' · '.$d['role'].' · '.$d['rating'].'/5').'</small></td><td><form method="post">';
  wp_nonce_field('icn_feedback_admin');echo '<input type="hidden" name="feedback_id" value="'.(int)$r['id'].'"><select name="status">';foreach(['open','reviewing','resolved']as$status)echo '<option value="'.esc_attr($status).'" '.selected($status,$r['status'],false).'>'.esc_html(ucfirst($status)).'</option>';
  echo '</select> <button class="button">Update</button></form></td></tr>';
 }
 echo '</tbody></table></div>';
}
