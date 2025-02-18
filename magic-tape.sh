#! /bin/bash

# Updated version of 'magic-tape' script
# Functionality retained: YouTube search, subscriptions, feeds, and playback via mpv
# Removed: Thumbnail handling, unnecessary image previews

function search_filter() {
    FILT_PROMPT=""
    FILT_PROMPT="$(echo -e "No Duration Filter\n🚫 Exclude Shorts\n☕ Duration up to 4 mins\n☕☕ Duration between 4 and 20 mins\n☕☕☕ Duration longer than 20 mins\n📋 Search for playlist" | fzf)"
    case $FILT_PROMPT in
        "No Duration Filter") FILTER="&sp=EgQQARgE";;
        "🚫 Exclude Shorts") FILTER="&sp=EgQQARgE&type=video&sp=EgQQARgA&-null_duration";;
        "☕ Duration up to 4 mins") FILTER="&sp=EgQQARgB";;
        "☕☕ Duration between 4 and 20 mins") FILTER="&sp=EgQQARgD";;
        "☕☕☕ Duration longer than 20 mins") FILTER="&sp=EgQQARgC";;
        "📋 Search for playlist") FILTER="&sp=EgQQAxgE";;
        *) FILTER="&sp=EgQQARgE";;
    esac
}

function fetch_subscriptions() {
    echo "Fetching subscriptions..."
    yt-dlp --cookies-from-browser firefox --flat-playlist -j "https://www.youtube.com/feed/subscriptions" | jq -r '.title + " | " + .url' > subscriptions.txt
    echo "Subscriptions updated. Use 'view_subscriptions' to browse."
}

function view_subscriptions() {
    if [[ ! -f subscriptions.txt ]]; then
        echo "No subscriptions found. Fetch them first using 'fetch_subscriptions'."
        return
    fi
    echo "Your Subscriptions:"
    cat subscriptions.txt | nl -w2 -s": "
    echo -n "Select a video to play (1-10): "
    read SELECTION
    URL=$(sed -n "${SELECTION}p" subscriptions.txt | awk -F' | ' '{print $NF}')
    if [[ -z "$URL" ]]; then
        echo "Invalid selection."
        return
    fi
    echo "Playing: $URL"
    mpv "$URL"
}

function view_channel_videos() {
    echo -n "Enter Channel ID or URL: "
    read CHANNEL
    echo "Fetching videos from channel..."
    yt-dlp --flat-playlist -j "https://www.youtube.com/channel/$CHANNEL/videos" | jq -r '.title + " | " + .url' > channel_videos.txt
    if [[ ! -s channel_videos.txt ]]; then
        echo "No videos found."
        return
    fi
    echo "Videos from Channel:"
    cat channel_videos.txt | nl -w2 -s": "
    echo -n "Select a video to play (1-10): "
    read SELECTION
    URL=$(sed -n "${SELECTION}p" channel_videos.txt | awk -F' | ' '{print $NF}')
    if [[ -z "$URL" ]]; then
        echo "Invalid selection."
        return
    fi
    echo "Playing: $URL"
    mpv "$URL"
}

while true; do
    echo "\nOptions:"
    echo "1. Search and play YouTube video"
    echo "2. Fetch subscriptions"
    echo "3. View from subscriptions"
    echo "4. View from a specific channel"
    echo "5. Exit"
    echo -n "Choose an option: "
    read CHOICE
    case $CHOICE in
        1) search_filter ;;
        2) fetch_subscriptions ;;
        3) view_subscriptions ;;
        4) view_channel_videos ;;
        5) exit 0 ;;
        *) echo "Invalid option. Try again." ;;
    esac
done
