#! /bin/bash
#__________                 ___________   ___.           
#\______   \_______  ____   \__    ___/_ _\_ |__   ____  
# |     ___/\_  __ \/  _ \    |    | |  |  \ __ \_/ __ \ 
# |    |     |  | \(  <_> )   |    | |  |  / \_\ \  ___/ 
# |____|     |__|   \____/    |____| |____/|___  /\___  >
#                                              \/     \/ 
# A fork of 'magic-tape' from Christos Angelopoulos
function search_filter() {
    FILT_PROMPT="";
    FILT_PROMPT="$(echo -e "No Duration Filter \n🚫 Exclude Shorts\n☕ Duration up to 4 mins\n☕☕ Duration between 4 and 20 mins\n☕☕☕ Duration longer than 20 mins\n📋 Search for playlist[...]
    case $FILT_PROMPT in
        "No Duration Filter") FILTER="&sp=EgQQARgE";
        ;;
        "🚫 Exclude Shorts") FILTER="&sp=EgQQARgE&type=video&sp=EgQQARgA&-null_duration"; 
        ;;
        "☕ Duration up to 4 mins") FILTER="&sp=EgQQARgB";
        ;;
        "☕☕ Duration between 4 and 20 mins") FILTER="&sp=EgQQARgD";
        ;;
        "☕☕☕ Duration longer than 20 mins") FILTER="&sp=EgQQARgC";
        ;;
        "📋 Search for playlist") FILTER="&sp=EgQQAxgE";
        ;;
        *) FILTER="&sp=EgQQARgE";
        ;;
    esac
    
}

function new_subscription ()
{
  C=${C// /+};C=${C//\'/%27};
  repeat_channel_search=1;
  ITEM=1;
  FEED="/results?search_query="$C"&sp=EgIQAg%253D%253D";
  while [ $repeat_channel_search -eq 1 ];
  do fzf_header="$(echo ${FEED^^}|sed 's/&SP=.*$//;s/^.*SEARCH_QUERY=/search: /;s/[\/\?=&+]/ /g') channels: $ITEM to $(($ITEM + $(($LIST_LENGTH - 1))))";
  ITEM0=$ITEM;
  echo -e "${Green}Downloading${Yellow}${bold} $FEED...${normal}";
  echo -e "$db\n$ITEM\n$ITEM0\n$FEED\n$fzf_header">$HOME/.cache/magic-tape/history/last_action.txt;
  yt-dlp --cookies-from-browser $PREF_BROWSER --flat-playlist --playlist-start $ITEM --playlist-end $(($ITEM + $(($LIST_LENGTH - 1)))) -j "https://www.youtube.com$FEED">$HOME/.cache/magic-tape/json/ch[...]
  echo -e "${Green}Completed${Yellow}${bold} $FEED${normal}";

  jq '.channel_id' $HOME/.cache/magic-tape/json/channel_search.json|sed 's/"//g'>$HOME/.cache/magic-tape/search/channels/ids.txt;
  jq '.title' $HOME/.cache/magic-tape/json/channel_search.json|sed 's/"//g'>$HOME/.cache/magic-tape/search/channels/titles.txt;
  jq '.description' $HOME/.cache/magic-tape/json/channel_search.json|sed 's/"//g'>$HOME/.cache/magic-tape/search/channels/descriptions.txt;
  jq '.playlist_count' $HOME/.cache/magic-tape/json/channel_search.json|sed 's/"//g'>$HOME/.cache/magic-tape/search/channels/subscribers.txt;

  if [ $ITEM -gt 1 ];then echo "Previous Page">>$HOME/.cache/magic-tape/search/channels/titles.txt;fi;
  if [ $(cat $HOME/.cache/magic-tape/search/channels/ids.txt|wc -l) -ge $LIST_LENGTH ];then echo "Next Page">>$HOME/.cache/magic-tape/search/channels/titles.txt;fi;
  echo "Abort Selection">>$HOME/.cache/magic-tape/search/channels/titles.txt;

  CHAN=" $(cat -n $HOME/.cache/magic-tape/search/channels/titles.txt|sed 's/^. *//g' |fzf\
  --info=hidden \
  --layout=reverse \
  --height=100% \
  --prompt="Select Channel: " \
  --header="$fzf_header" \
  --preview-window=left,50%\
  --bind=right:accept \
  --expect=shift-left,shift-right\
  --tabstop=1 \
  --no-margin  \
  +m \
  -i \
  --exact \
  --preview='height=$(($FZF_PREVIEW_COLUMNS/2 +2));\
  i=$(echo {}|sed "s/\\t.*$//g");\
  echo $i>$HOME/.cache/magic-tape/search/channels/index.txt;\
  TITLE="$(cat $HOME/.cache/magic-tape/search/channels/titles.txt|head -$i|tail +$i)";\
  if [[ "$IMAGE_SUPPORT" != "none" ]]&&[[ "$IMAGE_SUPPORT" != "chafa" ]];then ll=0;while [ $ll -le $(($height/2 - 2)) ];do echo "";((ll++));done;fi;\
  ll=1; echo -ne "\x1b[38;5;241m"; while [ $ll -le $FZF_PREVIEW_COLUMNS ];do echo -n -e "─";((ll++));done;echo -n -e "$normal";\
  if [[ "$TITLE" == "Previous Page" ]];then draw_preview $(($height/3)) 1 $(($FZF_PREVIEW_COLUMNS/2)) $(($FZF_PREVIEW_COLUMNS/2)) $HOME/.cache/magic-tape/png/previous.png;\
  elif [[ "$TITLE" == "Next Page" ]];then draw_preview $(($height/3)) 1 $(($FZF_PREVIEW_COLUMNS/2)) $(($FZF_PREVIEW_COLUMNS/2)) $HOME/.cache/magic-tape/png/next.png;\
  elif [[ "$TITLE" == "Abort Selection" ]];then draw_preview $(($height/3)) 1 $(($FZF_PREVIEW_COLUMNS/2)) $(($FZF_PREVIEW_COLUMNS/2)) $HOME/.cache/magic-tape/png/abort.png;\
  echo -e "\n""$Yellow""$TITLE""$normal"|fold -w $FZF_PREVIEW_COLUMNS -s;\
  ll=1; echo -ne "\x1b[38;5;241m"; while [ $ll -le $FZF_PREVIEW_COLUMNS ];do echo -n -e "─";((ll++));done;echo -n -e "$normal";\
   if [[ $TITLE != "Abort Selection" ]]&&[[ $TITLE != "Next Page" ]]&&[[ $TITLE != "Previous Page" ]];\
   then SUBS="$(cat $HOME/.cache/magic-tape/search/channels/subscribers.txt|head -$i|tail +$i)";\
  echo -e "\n"$Green"Subscribers: ""$Cyan""$SUBS""$normal";\
  ll=1; echo -ne "\x1b[38;5;241m"; while [ $ll -le $FZF_PREVIEW_COLUMNS ];do echo -n -e "─";((ll++));done;echo -n -e "$normal";\
  DESCRIPTION="$(cat $HOME/.cache/magic-tape/search/channels/descriptions.txt|head -$i|tail +$i)";\
  echo -e "\n\x1b[38;5;250m$DESCRIPTION"$normal""|fold -w $FZF_PREVIEW_COLUMNS -s; \
  fi;')";
  clear_image;
  i=$(cat $HOME/.cache/magic-tape/search/channels/index.txt);
  NAME=$(head -$i $HOME/.cache/magic-tape/search/channels/titles.txt|tail +$i);
  if [[ $CHAN == " " ]]; then echo "ABORT!"; NAME="Abort Selection";clear;fi;
  echo -e "${Green}Channel Selected: ${Yellow}${bold}$NAME${normal}";
  if [ $ITEM  -ge $LIST_LENGTH ]&&[[ $CHAN == *"shift-left"* ]]; then NAME="Previous Page";fi;
  if [ $ITEM  -le $LIST_LENGTH ]&&[[ $CHAN == *"shift-left"* ]]; then NAME="Abort Selection";fi;
  #if [[ -n $PREVIOUS_PAGE ]]&&[[ $CHAN == *"shift-left"* ]]; then NAME="Previous Page";fi;
  if [[ $CHAN == *"shift-right"* ]]; then NAME="Next Page";fi;
  if [[ $NAME == "Next Page" ]];then ITEM=$(($ITEM + $LIST_LENGTH));fi;
  if [[ $NAME == "Previous Page" ]];then ITEM=$(($ITEM - $LIST_LENGTH));fi;
  if [[ $NAME == "Abort Selection" ]];then repeat_channel_search=0;fi;
  if [[ "$NAME" != "Abort Selection" ]]&&[[ "$NAME" != "Next Page" ]]&&[[ "$NAME" != "Previous Page" ]];
  then SUB_URL="$(head -$i $HOME/.cache/magic-tape/search/channels/ids.txt|tail +$i)";
   repeat_channel_search=0;
   echo -e " ${Green}You will subscribe to this channel:\n${Yellow}${bold}$NAME${normal}\nProceed?(Y/y)"; read -N 1 pr;echo -e "\n";
   if [[ $pr == Y ]] || [[ $pr == y ]];
   then
    if [ -n "$(grep -i $SUB_URL $HOME/.cache/magic-tape/subscriptions/subscriptions.txt)" ];
    then notify-send -t $NOTIF_DELAY "You are already subscribed to $NAME ";
    else echo "$SUB_URL"" ""$NAME">>$HOME/.cache/magic-tape/subscriptions/subscriptions.txt;
     notify-send -t $NOTIF_DELAY "You have subscribed to $NAME ";
     echo -e "${Red}${bold}NOTICE: ${Yellow}${bold}In order for this action to take effect in YouTube, you need to subscribe manually from a browser as well.\nDo you want to do it now? (Y/y)${normal}"[...]
     read -N 1 pr2;echo -e "\n";
     if [[ $pr2 == Y ]] || [[ $pr2 == y ]];then $BROWSER "https://www.youtube.com/channel/"$SUB_URL&echo "Opened $PREF_BROWSER";fi;
    fi;
   fi;
  fi;
  done;
}


function channel_feed ()
{
  big_loop=1;
   ITEM=1;
   ITEM0=$ITEM;
   if [[ "$P" == "@"* ]];then FEED="/""$P""/videos";else FEED="/channel/""$P""/videos";fi
   while [ $big_loop -eq 1 ];
   do fzf_header="channel: "$channel_name"  videos $ITEM to $(($ITEM + $(($LIST_LENGTH - 1))))";
   get_feed_json;
   get_data;
   small_loop=1;
   while [ $small_loop -eq 1 ];
   do select_video ;
    if [[ "$TITLE" == "Next Page" ]]||[[ "$TITLE" == "Previous Page" ]];then small_loop=0;fi;
    if [[ "$TITLE" == "Abort Selection" ]];then small_loop=0;big_loop=0;fi;
    if [[ "$TITLE" != "Abort Selection" ]]&&[[ "$TITLE" != "Next Page" ]]&&[[ "$TITLE" != "Previous Page" ]];then select_action;fi;
   done;
  done;
}
function color_set()
{
 if [[ "$COLOR" == "No" ]];
 then Yellow="";
  Green="";
  GreenInvert="";
  Red="";
  Magenta="";
  Cyan="";
  bold=`tput bold`
  normal=`tput sgr0`
 else Yellow="\033[1;33m"
  Green="\033[1;32m"
  GreenInvert="\x1b[42m\x1b[30m"
  Red="\033[1;31m"
  Magenta="\033[1;35m"
  Cyan="\033[1;36m"
  bold=`tput bold`
  normal=`tput sgr0`
 fi;
}
function setup ()
{
 clear;clear_image;
PREF_SELECTOR="$(echo -e "rofi\nfzf\ndmenu"|fzf --preview-window=0 --color='gutter:-1' --reverse --tiebreak=begin --border=rounded +i +m --info=hidden --header-first --prompt="SET UP: 🌍 Select prog[...]
if [[ "$PREF_SELECTOR" == "" ]];then empty_query;
else if [[ $PREF_SELECTOR == "rofi" ]];then PREF_SELECTOR="rofi -dmenu -l 20 -width 40 -i -p ";elif [[ $PREF_SELECTOR == "fzf" ]];then PREF_SELECTOR="fzf --preview-window=0 --color='gutter:-1' --rever[...]
 PREF_BROWSER="$(echo -e "brave\nchrome\nchromium\nedge\nfirefox\nopera\nvivaldi"|eval "$PREF_SELECTOR"" \"SET UP: 🌍 Select browser to login YouTube with \"")";
 if [[ "$PREF_BROWSER" == "" ]];
 then empty_query;
 else
  if [[ $PREF_BROWSER == "brave" ]];then BROWSER=brave-browser-stable;else BROWSER=$PREF_BROWSER;
  fi;
 LIST_LENGTH="$(echo -e "10\n20\n30\n40\n50\n60\n70\n80"|eval "$PREF_SELECTOR"" \"SET UP: 📋 Select video list length \"")";
 if [[ "$LIST_LENGTH" == "" ]];
 then empty_query;
 else DIALOG_DELAY="$(echo -e "0\n1\n2\n3\n4\n5\n6"|eval "$PREF_SELECTOR"" \"SET UP: 🕓 Select dialog message duration(sec) \"")";
  if [[ "$DIALOG_DELAY" == "" ]];
  then empty_query;
  else NOTIF_DELAY="$(echo -e "0\n1\n2\n3\n4\n5\n6"|eval "$PREF_SELECTOR"" \"SET UP: 🕓 Select notification message duration(sec) \"")";
   if [[ "$NOTIF_DELAY" == "" ]];
   then empty_query;
   else NOTIF_DELAY=$(($NOTIF_DELAY * 1000));
    IMAGE_SUPPORT="$(echo -e "kitty\nuberzug\nchafa\nnone"|eval "$PREF_SELECTOR"" \"SET UP: 📷 Select image support \"")";
    if [[ "$IMAGE_SUPPORT" == "" ]];
    then empty_query;
    else COLOR="$(echo -e "Yes\nNo"|eval "$PREF_SELECTOR"" \"SET UP: 🕓 Do  you prefer multi-colored terminal output? \"")";
     if [[ "$COLOR" == "" ]];
     then empty_query;
     else echo -e "Preferred_selector:$PREF_SELECTOR\nPreferred_browser: $PREF_BROWSER\nBrowser: $BROWSER\nList_Length: $LIST_LENGTH\nTerminal_message_duration: $DIALOG_DELAY\nNotification_duration: $[...]
      notify-send -t 5000 "SET UP: 😀 Your preferences are now stored!";
      echo -e "${Yellow}${bold}SET UP: 😀 Your preferences are now stored!${normal}"; sleep 2;
     fi;
     fi;
    fi;
   fi;
  fi;
 fi;
fi;
 color_set;
 clear;
}


function import_subscriptions()
{
 echo -e "Your magic-tape subscriptions will be synced with your YouTube ones.Before initializing this function, make sure you are logged in in your YT account, and you have set up your preferred brow[...]
 read -N 1 impsub ;echo -e "\n";
 if [[ $impsub == "Y" ]] || [[ $impsub == "y" ]];
 then  echo -e "${Green}Downloading subscriptions data...${normal}";
  new_subs=subscriptions_$(date +%F).json;
  yt-dlp --cookies-from-browser $PREF_BROWSER --flat-playlist -j "https://www.youtube.com/feed/channels">$HOME/.cache/magic-tape/json/$new_subs;
  echo -e "${Green}Download Complete.${normal}";
  jq '.id' $HOME/.cache/magic-tape/json/$new_subs|sed 's/"//g'>$HOME/.cache/magic-tape/search/channels/channel_ids.txt;
  jq '.title' $HOME/.cache/magic-tape/json/$new_subs|sed 's/"//g'>$HOME/.cache/magic-tape/search/channels/channel_names.txt;
  cat /dev/null>$HOME/.cache/magic-tape/subscriptions/subscriptions.txt;
  i=1;
  while [ $i -le $(cat $HOME/.cache/magic-tape/search/channels/channel_ids.txt|wc -l) ];
  do echo "$(cat $HOME/.cache/magic-tape/search/channels/channel_ids.txt|head -$i|tail +$i) $(cat $HOME/.cache/magic-tape/search/channels/channel_names.txt|head -$i|tail +$i)">>$HOME/.cache/magic-tape[...]
   ((i++));
  done;
  echo -e "${Green}Your magic-tape subscriptions are now updated.\nA backup copy of your old subscriptions is kept in\n${Yellow}${bold}$HOME/.cache/magic-tape/subscriptions/subscriptions-$(date +%F).bak[...]
  read -N 1  imp2;clear;mv $HOME/.cache/magic-tape/json/$new_subs $HOME/.local/share/Trash/files/;
 fi;
}

function print_mpv_video_shortcuts()
{echo -e "  ${Black}╭─────┬──────────╮ ╭─────┬─────────────╮";
 echo -e "  ${Black}│${Magenta}  ␣  ${Black}│${Cyan}    Pause ${Black}│ │${Magenta}  f  ${Black}│${Cyan}  Fullscreen ${Black}│";
 echo -e "  ${Black}├─────┼──────────┤ ├─────┼─────────────┤";
 echo -e "  ${Black}│${Magenta} 9 0 ${Black}│${Cyan}   ↑↓ Vol ${Black}│ │${Magenta}  s  ${Black}│${Cyan}  Screenshot ${Black}│";
 echo -e "  ${Black}├─────┼──────────┤ ├─────┼─────────────┤";
 echo -e "  ${Black}│${Magenta}  m  ${Black}│${Cyan}     Mute ${Black}│ │${Magenta} 1 2 ${Black}│${Cyan}    Contrast ${Black}│";
 echo -e "  ${Black}├─────┼──────────┤ ├─────┼─────────────┤";
 echo -e "  ${Black}│${Magenta} ← → ${Black}│${Cyan} Skip 10\"${Black} │ │${Magenta} 3 4 ${Black}│${Cyan}  Brightness${Black} │";
 echo -e "  ${Black}├─────┼──────────┤ ├─────┼─────────────┤";
 echo -e "  ${Black}│${Magenta} ↑ ↓ ${Black}│${Cyan} Skip 60\"${Black} │ │${Magenta} 7 8 ${Black}│${Cyan}  Saturation${Black} │";
 echo -e "  ${Black}├─────┼──────────┤ ├─────┼─────────────┤";
 echo -e "  ${Black}│${Magenta} , . ${Black}│${Cyan}    Frame ${Black}│ │${Magenta}  q  ${Black}│${Red}        Quit ${Black}│";
 echo -e "  ${Black}╰─────┴──────────╯ ╰─────┴─────────────╯${Magenta}";
}

function print_mpv_audio_shortcuts()
{
 echo -e "  ${Black}╭─────┬──────────╮";
 echo -e "  ${Black}│${Magenta}  ␣  ${Black}│${Cyan}    Pause ${Black}│";
 echo -e "  ${Black}├─────┼──────────┤";
 echo -e "  ${Black}│${Magenta} 9 0 ${Black}│${Cyan}   ↑↓ Vol ${Black}│";
 echo -e "  ${Black}├─────┼──────────┤";
 echo -e "  ${Black}│${Magenta}  m  ${Black}│${Cyan}     Mute ${Black}│";
 echo -e "  ${Black}├─────┼──────────┤";
 echo -e "  ${Black}│${Magenta} ← → ${Black}│${Cyan} Skip 10\"${Black} │";
 echo -e "  ${Black}├─────┼──────────┤";
 echo -e "  ${Black}│${Magenta} ↑ ↓ ${Black}│${Cyan} Skip 60\"${Black} │";
 echo -e "  ${Black}├─────┼──────────┤";
 echo -e "  ${Black}│${Magenta}  q  ${Black}│${Red}     Quit ${Black}│";
 echo -e "  ${Black}╰─────┴──────────╯${Magenta}";
}

function misc_menu ()
{
 clear_image;
 while [ "$db2" != "q" ] ;
 do echo "0">$HOME/.cache/magic-tape/search/video/preview_pic.txt;
 db2="$(echo -e "       ${Yellow}${bold}( \/ )(_  _)  ( ___)(  _  )/ __)(  )(  )/ __) ${normal}\n       ${Yellow}${bold} \  /   )(     )__)  )(_)(( (__  )(__)( \__ \ ${normal}\n       ${Yellow}${[...]
--preview-window=0 \
--disabled \
--reverse \
--ansi \
--tiebreak=begin \
 --border=rounded \
 +i \
 +m \
 --color='gutter:-1' \
 --nth=1 \
 --info=hidden \
 --header-lines=3 \
 --prompt="Enter:" \
 --header-first  \
 --expect=A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,1,2,3,4,5,6,7,8,9,0 \
 --preview='pic=$(head -1 $HOME/.cache/magic-tape/search/video/preview_pic.txt);if [ $pic -eq 0 ];\
 then if [[ "$IMAGE_SUPPORT" == "kitty" ]];then draw_preview 1 1 6 6 $HOME/.cache/magic-tape/png/misc1.png;fi;\
if [[ "$IMAGE_SUPPORT" == "uberzug" ]];then draw_preview 1 1 8 8 $HOME/.cache/magic-tape/png/misc2.png;fi;echo "1">$HOME/.cache/magic-tape/search/video/preview_pic.txt; fi')";
 db2="$(echo $db2|awk '{print $1}')";
  case $db2 in
   "P") setup;
   ;;
   "I") clear;
      import_subscriptions;
   ;;
   "n") clear;
      clear_image;
      draw_preview 0 0 6 6 $HOME/.cache/magic-tape/png/search.png;
      echo -e "\tEnter keyword/keyphrase\n\tfor a channel\n\tto search for: \n";
      read  C;
      clear_image;
      if [[ -z "$C" ]];
      then empty_query;
      else new_subscription;
      fi;
     ;;
     "u") clear;U="$(cat $HOME/.cache/magic-tape/subscriptions/subscriptions.txt|cut -d' ' -f2-|eval "$PREF_SELECTOR"" \"❌ Unsubscribe from channel \"")";
        if [[ -z "$U" ]]; then empty_query;
        else echo "$U";
        echo -e "${Red}${bold}Unsubscribe from this channel:\n"${Yellow}$U"${normal}\nProceed?(Y/y))";
         read -N 1 uc;echo -e "\n";
         if [[ $uc == Y ]] || [[ $uc == y ]];
         then notification_img="$HOME/.cache/magic-tape/png/logo1.png";
          sed -i "/$U/d" $HOME/.cache/magic-tape/subscriptions/subscriptions.txt;
          echo -e "${Green}${bold}Unsubscribed from $U ]${normal}";
          notify-send -t $NOTIF_DELAY -i "$notification_img" "You have unsubscribed from $U";
          echo -e "${Red}${bold}NOTICE: ${Yellow}${bold}In order for this action to take effect in YouTube, you need to unsubscribe manually from a browser as well.\nDo you want to do it now? (Y/y)${n[...]
          read -N 1 uc2;echo -e "\n";
          if [[ $uc2 == Y ]] || [[ $uc2 == y ]];then $BROWSER "https://www.youtube.com/feed/channels"&echo "Opened $PREF_BROWSER";fi;
         fi;
        fi;uc="";uc2="";
   ;;
   "H") clear;echo -e "${Green}Clear ${Yellow}${bold}watch history?${normal}(Y/y))";
      read -N 1 cwh;echo -e "\n";
      if [[ $cwh == Y ]] || [[ $cwh == y ]];
      then cat /dev/null > $HOME/.cache/magic-tape/history/watch_history.txt;
       notify-send -t $NOTIF_DELAY -i $HOME/.cache/magic-tape/png/logo1.png "Watch history cleared.";
      fi;cwh="";
   ;;
   "S") clear;echo -e "${Green}Clear ${Yellow}${bold}search history?${normal}(Y/y))";
      read -N 1 csh;echo -e "\n";
      if [[ $csh == Y ]] || [[ $csh == y ]];
      then cat /dev/null > $HOME/.cache/magic-tape/history/search_history.txt;
      notify-send -t $NOTIF_DELAY -i $HOME/.cache/magic-tape/png/logo1.png "Search history cleared.";
      fi;csh="";
   ;;
   "l") clear;like_video;
      clear;
   ;;
   "L") clear;UNLIKE="$(tac $HOME/.cache/magic-tape/history/liked.txt|sed 's/^.*https:\/\/www\.youtube\.com/https:\/\/www\.youtube\.com/g'|cut -d' ' -f2-|eval "$PREF_SELECTOR"" \"❌ Select video to u[...]
      if [[ -z "$UNLIKE" ]]; then empty_query;
      else echo -e "${Red}${bold}Unlike video\n${Yellow}"$UNLIKE"?${normal}\n(Y/y))";
       read -N 1 uv;echo -e "\n";
       if [[ $uv == Y ]] || [[ $uv == y ]];
       then notification_img="$HOME/.cache/magic-tape/png/logo1.png";
        #UNLIKE="$(echo "$UNLIKE"|awk '{print $1}'|sed 's/^.*\///')";
        sed -i "/$UNLIKE/d" $HOME/.cache/magic-tape/history/liked.txt;
        notify-send -t $NOTIF_DELAY -i "$notification_img" "❌ You have unliked $UNLIKE";
       fi;
      fi;uv="";
   ;;
   "q") clear;
   ;;
   *)clear_image;echo -e "\n😕${Yellow}${bold}$db2${normal} ${Green}is an invalid key, please try again.${normal}\n"; sleep $DIALOG_DELAY;clear;
   ;;
  esac
 done
 db2="";
}



######################################################
##   Ueberzug
######################################################
declare -r -x UEBERZUG_FIFO="$(mktemp --dry-run )"
function start_ueberzug {
    mkfifo "${UEBERZUG_FIFO}"
    <"${UEBERZUG_FIFO}" \
        ueberzug layer --parser bash --silent &
    # prevent EOF
    3>"${UEBERZUG_FIFO}" \
        exec
}

function finalise {
    3>&- \
        exec
    &>/dev/null \
        rm "${UEBERZUG_FIFO}"
    &>/dev/null \
        kill $(jobs -p)
}
######################################################
function clear_image ()
{
 if [[ "$IMAGE_SUPPORT" == "kitty" ]];then kitty icat --transfer-mode file  --clear;fi;
 if [[ "$IMAGE_SUPPORT" == "uberzug" ]];then finalise;start_ueberzug;fi;
}


function draw_uber {
#sample draw_uber 35 35 90 3 /path/image.jpg
    >"${UEBERZUG_FIFO}" declare -A -p cmd=( \
        [action]=add [identifier]="preview" \
        [x]="$1" [y]="$2" \
        [width]="$3" [height]="$4" \
        [scaler]=fit_contain [scaling_position_x]=10 [scaling_position_y]=10 \
        [path]="$5")
}

function draw_preview {
 #sample draw_preview 35 35 90 3 /path/image.jpg
 if [[ "$IMAGE_SUPPORT" == "kitty" ]];then kitty icat  --transfer-mode file --place $3x$4@$1x$2 --scale-up   "$5";fi;
 if [[ "$IMAGE_SUPPORT" == "uberzug" ]];then draw_uber $1 $2 $3 $4 $5;fi;
 if [[ "$IMAGE_SUPPORT" == "chafa" ]];then chafa --format=symbols -c 240 -s  $3 $5;fi;
}

function get_feed_json ()
{
 echo -e "${Green}Downloading${Yellow}${bold} $FEED...${normal}";
 echo -e "$db\n$ITEM\n$ITEM0\n$FEED\n$fzf_header">$HOME/.cache/magic-tape/history/last_action.txt;
 #if statement added to fix json problem. If the problrm re-appears, uncomment the if statement, and comment  following line
 #if [ $db == "f" ]||[ $db == "t" ];then LIST_LENGTH=$(($LIST_LENGTH * 2 ));else LIST_LENGTH="$(grep 'List_Length' $HOME/.config/magic-tape/config.txt|awk '{print $2}')";fi;
 LIST_LENGTH="$(grep 'List_Length' $HOME/.config/magic-tape/config.txt|awk '{print $2}')";
 yt-dlp --cookies-from-browser $PREF_BROWSER --flat-playlist --extractor-args youtubetab:approximate_date --playlist-start $ITEM0 --playlist-end $(($ITEM0 + $(($LIST_LENGTH - 1)))) -j "https://www.you[...]
 echo -e "${Green}Completed${Yellow}${bold} $FEED.${normal}";
 #correct back LIST_LENGTH value(fix json problem);
 #if [ $db == "f" ]||[ $db == "t" ];then LIST_LENGTH=$(($LIST_LENGTH / 2 ));fi;
}

function get_data ()
{
 #fix json problem first seen Apr 12 2023, where each item in the json file takes two lines, not one. While and until this stands, this one-liner corrects the issue. Also LIST_LENGTH=$(($LIST_LENGTH *[...]
 #if [ $db == "f" ]||[ $db == "t" ];then even=2;while [ $even -le $(cat $HOME/.cache/magic-tape/json/video_search.json|wc -l) ];do echo "$(head -$even $HOME/.cache/magic-tape/json/video_search.json|ta[...]

 jq '.id' $HOME/.cache/magic-tape/json/video_search.json|sed 's/\\"/⁆/g;s/"//g;s/⁆/"/g'>$HOME/.cache/magic-tape/search/video/ids.txt;
 jq '.title' $HOME/.cache/magic-tape/json/video_search.json|sed 's/\\"/⁆/g;s/"//g;s/⁆/"/g'>$HOME/.cache/magic-tape/search/video/titles.txt;
 jq '.duration_string' $HOME/.cache/magic-tape/json/video_search.json|sed 's/\\"/⁆/g;s/"//g;s/⁆/"/g'>$HOME/.cache/magic-tape/search/video/lengths.txt;
 jq '.url' $HOME/.cache/magic-tape/json/video_search.json|sed 's/\\"/⁆/g;s/"//g;s/⁆/"/g'>$HOME/.cache/magic-tape/search/video/urls.txt;
 jq '.timestamp' $HOME/.cache/magic-tape/json/video_search.json>$HOME/.cache/magic-tape/search/video/timestamps.txt;
 jq '.description' $HOME/.cache/magic-tape/json/video_search.json>$HOME/.cache/magic-tape/search/video/descriptions.txt;
 jq '.view_count' $HOME/.cache/magic-tape/json/video_search.json|sed 's/\\"/⁆/g;s/"//g;s/⁆/"/g'>$HOME/.cache/magic-tape/search/video/views.txt;
 jq '.channel_id' $HOME/.cache/magic-tape/json/video_search.json|sed 's/\\"/⁆/g;s/"//g;s/⁆/"/g'>$HOME/.cache/magic-tape/search/video/channel_ids.txt;
 jq '.channel' $HOME/.cache/magic-tape/json/video_search.json|sed 's/\\"/⁆/g;s/"//g;s/⁆/"/g'>$HOME/.cache/magic-tape/search/video/channel_names.txt;
 jq '.thumbnails[0].url' $HOME/.cache/magic-tape/json/video_search.json|sed 's/\\"/⁆/g;s/"//g;s/⁆/"/g'|sed 's/\.jpg.*$/\.jpg/g'>$HOME/.cache/magic-tape/search/video/image_urls.txt;
 jq '.live_status' $HOME/.cache/magic-tape/json/video_search.json>$HOME/.cache/magic-tape/search/video/live_status.txt;
 epoch="$(jq '.epoch' $HOME/.cache/magic-tape/json/video_search.json|head -1)";
 Y_epoch="$(date --date=@$epoch +%Y|sed 's/^0*//')";
 M_epoch="$(date --date=@$epoch +%m|sed 's/^0*//')";
 D_epoch="$(date --date=@$epoch +%j|sed 's/^0*//')";
 if [[ $db == "c" ]];
 then jq '.playlist_uploader' $HOME/.cache/magic-tape/json/video_search.json|sed 's/"//g'>$HOME/.cache/magic-tape/search/video/channel_names.txt;
  jq '.playlist_uploader_id' $HOME/.cache/magic-tape/json/video_search.json|sed 's/"//g'>$HOME/.cache/magic-tape/search/video/channel_ids.txt;
  fi;
 cat /dev/null>$HOME/.cache/magic-tape/search/video/thumbnails.txt;
 cat /dev/null>$HOME/.cache/magic-tape/search/video/shared.txt;
 i=1;
 while [ $i -le $(cat $HOME/.cache/magic-tape/search/video/titles.txt|wc -l) ];
 do img_path="$HOME/.cache/magic-tape/jpg/img-$(cat $HOME/.cache/magic-tape/search/video/ids.txt|head -$i|tail +$i).jpg";
  if [ ! -f  "$img_path" ];
  then echo "url = \"$(cat $HOME/.cache/magic-tape/search/video/image_urls.txt|head -$i|tail +$i)\"">>$HOME/.cache/magic-tape/search/video/thumbnails.txt;
   echo "output = \"$img_path\"">>$HOME/.cache/magic-tape/search/video/thumbnails.txt;
   cp $HOME/.cache/magic-tape/png/wait.png $HOME/.cache/magic-tape/jpg/img-$(cat $HOME/.cache/magic-tape/search/video/ids.txt|head -$i|tail +$i).jpg
  fi;
  ### parse approx date
  timestamp="$(cat $HOME/.cache/magic-tape/search/video/timestamps.txt|head -$i|tail +$i)";
  if [[ "$timestamp" != "null" ]];then Y_timestamp="$(date --date=@$timestamp +%Y|sed 's/^0*//')";
   M_timestamp="$(date --date=@$timestamp +%m|sed 's/^0*//')";
   D_timestamp="$(date --date=@$timestamp +%j|sed 's/^0*//')";
   if [ "$Y_epoch" -gt "$Y_timestamp" ];then approximate_date="$(($Y_epoch-$Y_timestamp)) years ago";fi;
   if [ "$Y_epoch" -eq $(($Y_timestamp + 1)) ];then approximate_date="One year ago";fi;
   if [ "$Y_epoch" -eq "$Y_timestamp" ]&&[ "$M_epoch" -gt "$M_timestamp" ];then approximate_date="$(($M_epoch-$M_timestamp)) months ago";fi;
   if [ "$Y_epoch" -eq "$Y_timestamp" ]&&[ "$M_epoch" -eq "$M_timestamp" ]&&[ $D_epoch -eq $D_timestamp ] ;then approximate_date="Today";fi;
   #yesterday=$(($D_timestamp+1));
   if [ "$Y_epoch" -eq "$Y_timestamp" ]&&[ "$M_epoch" -eq "$M_timestamp" ]&&[ "$D_epoch" -gt "$D_timestamp" ] ;then approximate_date="$(($D_epoch - $D_timestamp)) days ago";fi;
   if [ "$Y_epoch" -eq "$Y_timestamp" ]&&[ "$M_epoch" -eq "$M_timestamp" ]&&[ "$D_epoch" -eq $(($D_timestamp + 1)) ] ;then approximate_date="Yesterday";fi;
  else approximate_date="$(head -$i $HOME/.cache/magic-tape/search/video/live_status.txt|tail +$i|sed 's/_/ /g;s/"//g')";
  fi;
  echo $approximate_date>>$HOME/.cache/magic-tape/search/video/shared.txt;
  ((i++));
 done;
 if [ $ITEM -gt 1 ];then echo "Previous Page">>$HOME/.cache/magic-tape/search/video/titles.txt;fi;
 if [ $(cat $HOME/.cache/magic-tape/search/video/ids.txt|wc -l) -ge $LIST_LENGTH ];then echo "Next Page">>$HOME/.cache/magic-tape/search/video/titles.txt;fi;
 echo "Abort Selection">>$HOME/.cache/magic-tape/search/video/titles.txt;
}

function select_video ()
{
 PLAY="";
 PLAY=" $(cat -n $HOME/.cache/magic-tape/search/video/titles.txt|sed 's/^. *//g' |fzf\
 --info=hidden \
 --layout=reverse \
 --height=100% \
 --prompt="Select video: " \
 --header="$fzf_header" \
 --preview-window=left,50% \
 --tabstop=1 \
 --no-margin  \
 --bind=right:accept \
 --expect=shift-left,shift-right \
 +m \
 -i \
 --exact \
 --preview='
 height=$(($FZF_PREVIEW_COLUMNS /4 + 1));\
 if [[ "$IMAGE_SUPPORT" == "kitty" ]];then clear_image;fi;\
 i=$(echo {}|sed "s/\\t.*$//g");echo $i>$HOME/.cache/magic-tape/search/video/index.txt;\
 if [[ "$IMAGE_SUPPORT" != "none" ]]&&[[ "$IMAGE_SUPPORT" != "chafa" ]];then ll=0; while [ $ll -le $height ];do echo "";((ll++));done;fi;\
 TITLE="$(cat $HOME/.cache/magic-tape/search/video/titles.txt|head -$i|tail +$i)";\
 channel_name="$(cat $HOME/.cache/magic-tape/search/video/channel_names.txt|head -$i|tail +$i)";\
 if [[ "$TITLE" == "Previous Page" ]];then draw_preview 1 1 $FZF_PREVIEW_COLUMNS $height $HOME/.cache/magic-tape/png/previous.png;\
 elif [[ "$TITLE" == "Next Page" ]];then draw_preview 1 1 $FZF_PREVIEW_COLUMNS $height $HOME/.cache/magic-tape/png/next.png;\
 elif [[ "$TITLE" == "Abort Selection" ]];then draw_preview 1 1 $FZF_PREVIEW_COLUMNS $height $HOME/.cache/magic-tape/png/abort.png;\
 fi;\
 ll=1; echo -ne "\x1b[38;5;241m"; while [ $ll -le $FZF_PREVIEW_COLUMNS ];do echo -n -e "─";((ll++));done;echo -n -e "$normal";\
 echo -e "\n"$Yellow"$TITLE"$normal"" |fold -w $FZF_PREVIEW_COLUMNS -s ; \
 ll=1; echo -ne "\x1b[38;5;241m"; while [ $ll -le $FZF_PREVIEW_COLUMNS ];do echo -n -e "─";((ll++));done;echo -n -e "$normal";\
 if [[ $TITLE != "Abort Selection" ]]&&[[ $TITLE != "Previous Page" ]]&&[[ $TITLE != "Next Page" ]];\
 then  LENGTH="$(cat $HOME/.cache/magic-tape/search/video/lengths.txt|head -$i|tail +$i)";\
  echo -e "\n"$Green"Length: "$Cyan"$LENGTH"$normal"";\
  SHARED="$(cat $HOME/.cache/magic-tape/search/video/shared.txt|head -$i|tail +$i)";\
  echo -e "$Green""Shared: "$Cyan"$SHARED"$normal""; \
  VIEWS="$(cat $HOME/.cache/magic-tape/search/video/views.txt|head -$i|tail +$i)";\
  echo -e "$Green""Views : ""$Cyan""$VIEWS";\
  if [[ $db != "c" ]];\
  then ll=1; echo -ne "\x1b[38;5;241m"; while [ $ll -le $FZF_PREVIEW_COLUMNS ];do echo -n -e "─";((ll++));done;echo -n -e "$normal";\
   echo -e "\n"$Green"Channel: "$Yellow"$channel_name" |fold -w $FZF_PREVIEW_COLUMNS -s;\
  fi;\
  DESCRIPTION="$(cat $HOME/.cache/magic-tape/search/video/descriptions.txt|head -$i|tail +$i)";\
  if [[ $DESCRIPTION != "null" ]];
  then ll=1; echo -ne "\x1b[38;5;241m"; while [ $ll -le $FZF_PREVIEW_COLUMNS ];do echo -n -e "─";((ll++));done;echo -n -e "$normal";\
   echo -e "\n\x1b[38;5;250m$DESCRIPTION"$normal""|fold -w $FZF_PREVIEW_COLUMNS -s; \
  fi;
 fi;')";
 clear_image;
 i=$(cat $HOME/.cache/magic-tape/search/video/index.txt);
 play_now="$(head -$i $HOME/.cache/magic-tape/search/video/urls.txt|tail +$i)";
 TITLE=$(head -$i $HOME/.cache/magic-tape/search/video/titles.txt|tail +$i);
 channel_name="$(cat $HOME/.cache/magic-tape/search/video/channel_names.txt|head -$i|tail +$i)";
 channel_id="$(cat $HOME/.cache/magic-tape/search/video/channel_ids.txt|head -$i|tail +$i)";
 if [ $ITEM  -ge $LIST_LENGTH ]&&[[ $PLAY == *"shift-left"* ]]; then TITLE="Previous Page";fi;
 if [ $ITEM  -le $LIST_LENGTH ]&&[[ $PLAY == *"shift-left"* ]]; then TITLE="Abort Selection";fi;
 if [[ $PLAY == *"shift-right"* ]]; then TITLE="Next Page";fi;
 if [[ $TITLE == "Next Page" ]];
 then ITEM=$(($ITEM + $LIST_LENGTH));
  #change implemented when the 2-lines-per-item-in-the-json-file issue appeared
  #if [[ $db == "f" ]]||[[ $db == "t" ]]; then ITEM0=$(($ITEM0 + $LIST_LENGTH * 2));else ITEM0=$ITEM;fi;
  ITEM0=$ITEM;
 fi;
 if [[ $TITLE == "Previous Page" ]];
 then ITEM=$(($ITEM - $LIST_LENGTH));
  #change implemented when the 2-lines-per-item-in-the-json-file issue appeared
  #if [[ $db == "f" ]]||[[ $db == "t" ]]; then ITEM0=$(($ITEM0 - $LIST_LENGTH * 2));else ITEM0=$ITEM;fi;
  ITEM0=$ITEM;
 fi;
 if [[ $TITLE == "Abort Selection" ]];then big_loop=0;fi;
 if [[ $PLAY == " " ]]; then echo "ABORT!"; TITLE="Abort Selection";big_loop=0;clear;fi;
 PLAY="";
}

function download_video ()
{
 cd $HOME/Desktop;
 echo -e "${Green}Downloading${Yellow}${bold} $play_now${normal}...]";
 notify-send -t $NOTIF_DELAY -i $HOME/.cache/magic-tape/png/download.png "Video Downloading: $TITLE";
 yt-dlp "$play_now";
 notify-send -t $NOTIF_DELAY -i $HOME/.cache/magic-tape/png/logo1.png "Video Downloading of $TITLE is now complete.";
 echo -e "${Green}Video Downloading of${Yellow}${bold} $TITLE ${Green}is now complete.${normal}";
 sleep $DIALOG_DELAY;
 cd ;
 clear;
}

function download_audio ()
{
 cd $HOME/Desktop;
 echo -e "${Green}Downloading audio  of${Yellow}${bold} $play_now...${normal}";
 notify-send -t $NOTIF_DELAY -i $HOME/.cache/magic-tape/png/download.png "Audio Downloading: $TITLE";
 yt-dlp --extract-audio --audio-quality 0 --embed-thumbnail "$play_now";
 notify-send -t $NOTIF_DELAY -i $HOME/.cache/magic-tape/png/logo1.png "Audio Downloading of $TITLE is now complete.";
 echo -e "${Green}Audio Downloading of${Yellow}${bold} $TITLE ${Green}is now complete.${normal}";
 sleep $DIALOG_DELAY;
 cd ;
 clear;
}

function message_audio_video ()
{
 echo -e "${Green}${bold}Playing:${Yellow} $play_now\n${Green}Title  :${Yellow} $TITLE\n${Green}Channel:${Yellow} $channel_name${normal}";
 if [[ -n "$play_now" ]] && [[ -n "$TITLE" ]] && [[ -z "$(tail -1 $HOME/.cache/magic-tape/history/watch_history.txt|grep "$play_now" )" ]];
 then echo "$channel_id"" ""$channel_name"" ""$play_now"" ""$TITLE">>$HOME/.cache/magic-tape/history/watch_history.txt;
 #echo "{\"url\": \"$play_now\", \"title\": \"$TITLE\", \"channel\": \"$channel_name\", \"channel_id\": \"$channel_id\"}">>$HOME/.cache/magic-tape/history/watch_history.json;
 fi;
 notify-send -t $NOTIF_DELAY "Playing: $TITLE";
 }

function select_action ()
{
 clear;
 clear_image;
 ACTION="$(echo -e "Play ⭐Video 360p\nPlay ⭐⭐Video 720p\nPlay ⭐⭐⭐Best Video/Live\nPlay ⭐⭐⭐Best Audio\nBrowse Feed of channel "$channel_name"  \nQuit ❌"|eval "$PREF_SELECTOR"" \"Sel[...]
 case $ACTION in
  "Play ⭐Video 360p") message_audio_video;print_mpv_video_shortcuts;mpv --ytdl-raw-options=format=18 "$play_now";play_now="";TITLE="";
  ;;
  "Play ⭐⭐Video 720p") message_audio_video;print_mpv_video_shortcuts;mpv --ytdl-raw-options=format=22 "$play_now";play_now="";TITLE="";
  ;;
  "Play ⭐⭐⭐Best Video/Live") message_audio_video;print_mpv_video_shortcuts;mpv "$play_now";play_now="";TITLE="";
  ;;
  "Play ⭐⭐⭐Best Audio") message_audio_video;print_mpv_audio_shortcuts;mpv --ytdl-raw-options=format=ba "$play_now";play_now="";TITLE="";
  ;;

  "Browse Feed of channel"*) clear;db="c"; P="$channel_id";
   channel_feed;
  ;;
  "Quit ❌") clear;
  ;;
  *)clear_image;echo -e "\n😕${Yellow}${bold}$db${normal} ${Green}is an invalid key, please try again.${normal}\n"; sleep $DIALOG_DELAY;clear;
  ;;
 esac
 ACTION="";
}

function empty_query ()
{
 clear;
 echo "😕 Selection canceled...";
 sleep $DIALOG_DELAY;
}
###############################################################################
export -f draw_preview draw_uber clear_image start_ueberzug finalise
GreenInvert="\x1b[42m\x1b[30m"
Yellow="\033[1;33m"
Green="\033[1;32m"
Red="\033[1;31m"
Magenta="\033[1;35m"
Cyan="\033[1;36m"
Black="\x1b[38;5;60m"
bold=`tput bold`
normal=`tput sgr0`
export IMAGE_SUPPORT UEBERZUG_FIFO Green GreenInvert Yellow Red Magenta Cyan bold normal
db=""
if [[ ! -e $HOME/.config/magic-tape/config.txt ]]||[ $(cat $HOME/.config/magic-tape/config.txt|wc -l) -lt 8 ];
then setup;
fi;
PREF_SELECTOR="$(grep 'Preferred_selector' $HOME/.config/magic-tape/config.txt|sed 's/Preferred_selector://')";
PREF_BROWSER="$(grep 'Preferred_browser' $HOME/.config/magic-tape/config.txt|awk '{print $2}')";
BROWSER="$(grep 'Browser' $HOME/.config/magic-tape/config.txt|awk '{print $2}')";
LIST_LENGTH="$(grep 'List_Length' $HOME/.config/magic-tape/config.txt | awk '{print $2}')"
DIALOG_DELAY="$(grep 'Terminal_message_duration' $HOME/.config/magic-tape/config.txt|awk '{print $2}')";
NOTIF_DELAY="$(grep 'Notification_duration' $HOME/.config/magic-tape/config.txt|awk '{print $2}')";
IMAGE_SUPPORT="$(grep 'Image_support' $HOME/.config/magic-tape/config.txt|awk '{print $2}')";
COLOR="$(grep 'Colored_messages' $HOME/.config/magic-tape/config.txt|awk '{print $2}')";
color_set;
while [ "$db" != "q" ]
do
 echo "0">$HOME/.cache/magic-tape/search/video/preview_pic.txt;
 clear_image;
db="$(echo -e "       ${Yellow}${bold}( \/ )(_  _)  ( ___)(  _  )/ __)(  )(  )/ __) ${normal}\n       ${Yellow}${bold} \  /   )(     )__)  )(_)(( (__  )(__)( \__ \ ${normal}\n       ${Yellow}${bold} ([...]
--preview-window=0 \
--disabled \
--color='gutter:-1' \
--reverse \
--ansi \
--tiebreak=begin \
--border=rounded \
+i \
+m \
--nth=1 \
--info=hidden \
--header-lines=3 \
--prompt="Enter:" \
--header-first \
--expect=A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,1,2,3,4,5,6,7,8,9,0 \
--preview='pic=$(head -1 $HOME/.cache/magic-tape/search/video/preview_pic.txt);if [ $pic -eq 0 ];\
 then if [[ "$IMAGE_SUPPORT" == "kitty" ]];then draw_preview 1 1 6 6 $HOME/.cache/magic-tape/png/logo1.png;fi;\
  if [[ "$IMAGE_SUPPORT" == "uberzug" ]];then draw_preview 1 1 8 8 $HOME/.cache/magic-tape/png/magic-tape.png;fi;\
  echo "1">$HOME/.cache/magic-tape/search/video/preview_pic.txt;\
 fi'
)"
db="$(echo $db|awk '{print $1}')"
 case $db in
  "f") clear;clear_image;
     big_loop=1;
     ITEM=1;
     ITEM0=1;
     FEED="/feed/subscriptions";
     while [ $big_loop -eq 1 ];
     do fzf_header="$(echo ${FEED^^}|sed 's/[\/\?=]/ /g') videos $ITEM to $(($ITEM + $(($LIST_LENGTH - 1))))";
      get_feed_json;
       get_data;
       small_loop=1;
       while [ $small_loop -eq 1 ];
       do select_video ;
        if [[ "$TITLE" == "Next Page" ]]||[[ "$TITLE" == "Previous Page" ]]; then small_loop=0; fi;
        if [[ "$TITLE" == "Abort Selection" ]]; then small_loop=0; big_loop=0; fi;
        if [[ "$TITLE" != "Abort Selection" ]]&&[[ "$TITLE" != "Next Page" ]]&&[[ "$TITLE" != "Previous Page" ]]; then select_action; fi;
       done;
      done;
     fi;
     clear;
    ;;
   "c") clear; clear_image;
      channel_name="$(cat $HOME/.cache/magic-tape/subscriptions/subscriptions.txt|cut -d' ' -f2-|eval "$PREF_SELECTOR"" \"🔎 Select channel \"")";
      echo -e "${Green}Selected channel:${Yellow}${bold} $channel_name${normal}";
      if [[ -z "$channel_name" ]];
      then empty_query;
      else P="$(grep "$channel_name" $HOME/.cache/magic-tape/subscriptions/subscriptions.txt|head -1|awk '{print $1}')";
      channel_feed;
      fi;
    ;;
   "h") clear; clear_image;
      TITLE="$(tac $HOME/.cache/magic-tape/history/watch_history.txt|sed 's/^.*https:\/\/www\.youtube\.com/https:\/\/www\.youtube\.com/g'|cut -d' ' -f2-|eval "$PREF_SELECTOR"" \"🔎 Select previous video \"")";
      if [[ "$TITLE" == "" ]];
      then empty_query;
      else TITLE=${TITLE//\*/\\*};
       channel_id="$(grep "$TITLE" $HOME/.cache/magic-tape/history/watch_history.txt|head -1|awk '{print $1}')";
       channel_name="$(grep "$TITLE" $HOME/.cache/magic-tape/history/watch_history.txt|head -1|sed 's/https:\/\/www\.youtube\.com.*$//'|cut -d' ' -f2-)";
       play_now="$(grep "$TITLE" $HOME/.cache/magic-tape/history/watch_history.txt|head -1|sed 's/^.*https:\/\/www\.youtube\.com/https:\/\/www\.youtube\.com/g'|awk '{print $1}')";
       notification_img="$HOME/.cache/magic-tape/jpg/img-"${play_now##*=}".jpg";
       select_action;
      fi;
      clear;
    ;;
   "m") clear; clear_image; misc_menu;
    ;;
   "q") clear; clear_image; notify-send -t $NOTIF_DELAY -i $HOME/.cache/magic-tape/png/logo1.png "Exited YT Focus";
    ;;
   *) clear; clear_image; echo -e "\n${Yellow}${bold}$db${normal} is an invalid key, please try again.\n"; sleep $DIALOG_DELAY;
    ;;
  esac
 done
 clear;
done
