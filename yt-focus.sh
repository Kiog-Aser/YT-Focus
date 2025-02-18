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

# Create necessary directories
mkdir -p "$CONFIG_DIR" "$CACHE_DIR"
touch "$HISTORY_FILE"

# Default settings
BROWSER="safari"
LIST_LENGTH=20
NOTIF_DELAY=3

# Function to show notifications (Mac version)
notify() {
    terminal-notifier -message "$1" -title "YT Focus"
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
            q)  echo -e "\n${GREEN}Goodbye!${NORMAL}"
                exit 0
                ;;
            *)  echo -e "\n${RED}Invalid option${NORMAL}"
                sleep 1
                ;;
        esac
    done
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