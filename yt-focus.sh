#!/bin/bash

# Colors and formatting
YELLOW="\033[1;33m"
GREEN="\033[1;32m"
RED="\033[1;31m"
CYAN="\033[1;36m"
NORMAL="\033[0m"
BOLD=$(tput bold)

# Configuration
CONFIG_DIR="$HOME/.config/yt-focus"
CACHE_DIR="$HOME/.cache/yt-focus"
HISTORY_FILE="$CACHE_DIR/watch_history.txt"
SUBS_FILE="$CACHE_DIR/subscriptions.txt"
SUBS_CACHE="$CACHE_DIR/subs_cache.json"

# Create necessary directories
mkdir -p "$CONFIG_DIR" "$CACHE_DIR"
touch "$HISTORY_FILE" "$SUBS_FILE"

# Default settings
BROWSER="safari"
LIST_LENGTH=20
NOTIF_DELAY=3

# Function to show notifications (Mac version)
notify() {
    terminal-notifier -message "$1" -title "YT Focus"
}

# Function to import YouTube subscriptions
function import_subscriptions() {
    echo -e "${GREEN}Importing subscriptions from YouTube...${NORMAL}"
    echo -e "${YELLOW}This requires you to be logged in to YouTube in your browser.${NORMAL}"
    read -p "Continue? (y/n): " confirm
    
    if [[ $confirm == "y" ]]; then
        echo -e "${CYAN}Downloading subscription data...${NORMAL}"
        
        # Backup existing subscriptions
        if [[ -f "$SUBS_FILE" ]]; then
            cp "$SUBS_FILE" "${SUBS_FILE}.backup"
        fi
        
        # Get subscriptions using yt-dlp
        yt-dlp --cookies-from-browser "$BROWSER" \
               --no-warnings \
               --flat-playlist \
               -j "https://www.youtube.com/feed/channels" > "$SUBS_CACHE"

        if [[ $? -eq 0 ]]; then
            # Process the JSON and extract channel information
            echo -n > "$SUBS_FILE"  # Clear existing subscriptions
            while IFS= read -r line; do
                channel_id=$(echo "$line" | jq -r '.id')
                channel_name=$(echo "$line" | jq -r '.title')
                echo "$channel_id|$channel_name" >> "$SUBS_FILE"
            done < "$SUBS_CACHE"
            
            notify "Successfully imported YouTube subscriptions"
            echo -e "${GREEN}Successfully imported subscriptions!${NORMAL}"
            sleep 2
        else
            echo -e "${RED}Failed to import subscriptions${NORMAL}"
            sleep 2
        fi
    fi
}

# Function to get channel videos
function get_channel_videos() {
    local channel_id="$1"
    local channel_name="$2"
    
    echo -e "${CYAN}Loading videos from channel: ${YELLOW}$channel_name${NORMAL}"
    
    yt-dlp --no-warnings --get-id --get-title --flat-playlist \
           --playlist-start 1 \
           --playlist-end "$LIST_LENGTH" \
           --extractor-args "youtube:skip=translated_subs;lang=en" \
           --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
           --add-header "Accept-Language: en-US,en;q=0.9" \
           --sleep-requests 1 \
           "https://www.youtube.com/channel/$channel_id/videos" 2>/dev/null
}

# Function to view subscriptions feed
function view_subscriptions_feed() {
    if [[ ! -s "$SUBS_FILE" ]]; then
        echo -e "${RED}No subscriptions found. Import them first.${NORMAL}"
        sleep 2
        return
    fi

    local selection=$(cat "$SUBS_FILE" | 
        awk -F'|' '{print $2}' | 
        fzf --preview-window=hidden --prompt="Select channel: ")
    
    if [[ -n "$selection" ]]; then
        local channel_id=$(grep "|$selection$" "$SUBS_FILE" | cut -d'|' -f1)
        local results=$(get_channel_videos "$channel_id" "$selection")
        
        if [[ -n "$results" ]]; then
            local video_selection=$(echo "$results" | paste -d '|' - - | 
                fzf --delimiter='|' \
                    --with-nth=2 \
                    --preview-window=hidden \
                    --prompt="Select video: ")
            
            if [[ -n "$video_selection" ]]; then
                local video_id=$(echo "$video_selection" | cut -d'|' -f1)
                local title=$(echo "$video_selection" | cut -d'|' -f2)
                
                local quality=$(echo -e "360p\n720p\nbest\naudio" | 
                    fzf --preview-window=hidden --prompt="Select quality: ")
                
                if [[ -n "$quality" ]]; then
                    play_video "https://youtube.com/watch?v=$video_id" "$title" "$quality"
                fi
            fi
        else
            echo -e "${RED}No videos found for this channel${NORMAL}"
            sleep 2
        fi
    fi
}

# Function to search YouTube with improved reliability
function search_youtube() {
    local query="$1"
    local filter="$2"
    
    # Use yt-dlp with additional options for better reliability
    yt-dlp --no-warnings --get-id --get-title --flat-playlist \
           --playlist-start 1 \
           --playlist-end "$LIST_LENGTH" \
           --extractor-args "youtube:skip=translated_subs;lang=en" \
           --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
           --add-header "Accept-Language: en-US,en;q=0.9" \
           --sleep-requests 1 \
           --no-playlist \
           "ytsearch$LIST_LENGTH:$query$filter" 2>/dev/null || \
    echo "Error: Could not fetch search results. Please try again."
}

# Function to play video
function play_video() {
    local url="$1"
    local title="$2"
    local quality="$3"

    echo -e "${GREEN}Playing:${YELLOW} $title${NORMAL}"
    notify "Playing: $title"

    case $quality in
        "360p")  mpv --ytdl-format="18" --user-agent="Mozilla/5.0" "$url" ;;
        "720p")  mpv --ytdl-format="22" --user-agent="Mozilla/5.0" "$url" ;;
        "best")  mpv --ytdl-format="bestvideo[height<=1080]+bestaudio/best" --user-agent="Mozilla/5.0" "$url" ;;
        "audio") mpv --ytdl-format="bestaudio" --user-agent="Mozilla/5.0" "$url" ;;
    esac

    # Add to history
    echo "$(date +%Y-%m-%d_%H:%M:%S) $url $title" >> "$HISTORY_FILE"
}

# Main menu
function main_menu() {
    while true; do
        local choice
        echo -e "\n${YELLOW}${BOLD}YT Focus${NORMAL}"
        echo "1. Search Videos"
        echo "2. View History"
        echo "3. Play from URL"
        echo "4. View Subscriptions"
        echo "5. Import Subscriptions"
        echo "q. Quit"
        read -p "Select option: " choice

        case $choice in
            1)  echo -e "\n${GREEN}Enter search term:${NORMAL} "
                read query
                if [[ -n "$query" ]]; then
                    echo -e "${CYAN}Searching...${NORMAL}"
                    # Get search results
                    local results=$(search_youtube "$query" "")
                    if [[ -n "$results" && "$results" != "Error:"* ]]; then
                        # Display results using fzf
                        local selection=$(echo "$results" | paste -d '|' - - | 
                            fzf --delimiter='|' \
                                --with-nth=2 \
                                --preview-window=hidden \
                                --prompt="Select video: ")
                        
                        if [[ -n "$selection" ]]; then
                            local video_id=$(echo "$selection" | cut -d'|' -f1)
                            local title=$(echo "$selection" | cut -d'|' -f2)
                            
                            # Quality selection
                            local quality=$(echo -e "360p\n720p\nbest\naudio" | 
                                fzf --preview-window=hidden --prompt="Select quality: ")
                            
                            if [[ -n "$quality" ]]; then
                                play_video "https://youtube.com/watch?v=$video_id" "$title" "$quality"
                            fi
                        fi
                    else
                        echo -e "${RED}${results}${NORMAL}"
                        sleep 2
                    fi
                fi
                ;;
            2)  if [[ -s "$HISTORY_FILE" ]]; then
                    local history_selection=$(tac "$HISTORY_FILE" | 
                        fzf --preview-window=hidden --prompt="Select from history: ")
                    if [[ -n "$history_selection" ]]; then
                        local url=$(echo "$history_selection" | awk '{print $2}')
                        local title=$(echo "$history_selection" | cut -d' ' -f3-)
                        local quality=$(echo -e "360p\n720p\nbest\naudio" | 
                            fzf --preview-window=hidden --prompt="Select quality: ")
                        if [[ -n "$quality" ]]; then
                            play_video "$url" "$title" "$quality"
                        fi
                    fi
                else
                    echo -e "\n${RED}No watch history found${NORMAL}"
                    sleep 2
                fi
                ;;
            3)  echo -e "\n${GREEN}Enter YouTube URL:${NORMAL} "
                read url
                if [[ -n "$url" ]]; then
                    echo -e "${CYAN}Fetching video information...${NORMAL}"
                    local title=$(yt-dlp --no-warnings --get-title "$url" 2>/dev/null)
                    if [[ -n "$title" ]]; then
                        local quality=$(echo -e "360p\n720p\nbest\naudio" | 
                            fzf --preview-window=hidden --prompt="Select quality: ")
                        if [[ -n "$quality" ]]; then
                            play_video "$url" "$title" "$quality"
                        fi
                    else
                        echo -e "${RED}Error: Could not fetch video information${NORMAL}"
                        sleep 2
                    fi
                fi
                ;;
            4)  view_subscriptions_feed
                ;;
            5)  import_subscriptions
                ;;
            q)  echo -e "\n${GREEN}Goodbye!${NORMAL}"
                exit 0
                ;;
            *)  echo -e "\n${RED}Invalid option${NORMAL}"
                sleep 1
                ;;
        esac
    done
}

}

# Check for required dependencies
for cmd in yt-dlp mpv fzf terminal-notifier; do
    if ! command -v "$cmd" &> /dev/null; then
        echo -e "${RED}Error: Required command '$cmd' not found${NORMAL}"
        echo "Please install missing dependencies using Homebrew:"
        echo "brew install yt-dlp mpv fzf terminal-notifier"
        exit 1
    fi
done

# Update yt-dlp before starting
yt-dlp -U >/dev/null 2>&1

# Start the program
main_menu
