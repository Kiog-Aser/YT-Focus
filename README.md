# YT-Focus
A better way to watch youtube. No ads, no tracking and no distractions. Pure focus and education (or entertainment).

A fork of ['Magic Tape'](https://gitlab.com/christosangel/magic-tape/-/tree/main?ref_type=heads) by Christos Angelopoulos

The original version has more features, but I want a more minimalistic and 'focused' approach.

With YT Focus, through the __main menu__, the user can

  * Browse  videos from __subscriptions__. (Not Working Currently)

  * make a video __search__, using keywords or phrases.

  * Watch a previously watched video (__watch history__).

  * Browse videos from a __subcsribed channel__.

  * __Watch/download__ video/audio content, in various formats.



Through the __miscellaneous menu__ the user can

  * __Set up Preferences__ (configuration).

  * __Import subscriptions__ from YouTube.

  * __Subscribe__ to/ __Unsubscribe__ from a channel.


## Dependencies

Instructions on installing yt-dlp can be found here:

[https://github.com/yt-dlp/yt-dlp#installation](https://github.com/yt-dlp/yt-dlp#installation)

Easily install yt-dlp using pip:

```
pip install yt-dlp
```

Other dependencies include:

* [cURL](https://curl.se/)

* [rofi](https://github.com/davatorium/rofi)

* [fzf](https://github.com/junegunn/fzf)

* [mpv](https://github.com/mpv-player/mpv)

* [jq](https://stedolan.github.io/jq/)

* [xclip](https://github.com/astrand/xclip)

* [dmenu](http://tools.suckless.org/dmenu/)

* [imagemagick](https://imagemagick.org/index.php)

Regarding image support, it can either be achived with

* [kitty terminal](https://sw.kovidgoyal.net/kitty/)


```
sudo apt install kitty
```

with

* [ueberzug](https://github.com/seebye/ueberzug)


or with

* [chafa](https://github.com/hpjansson/chafa)

```
sudo apt install chafa
```

To install these dependencies, run the following command:

```
sudo apt install curl fzf mpv jq xclip
```

To install `rofi`:

```
sudo apt install rofi
```

To install `dmenu`:

```
sudo apt install dmenu
```


## Install

```
git clone https://gitlab.com/christosangel/magic-tape.git

cd magic-tape/

```

To run the script from any directory, it has to be made executable, and then copied to `$PATH`,:

```

chmod +x magic-tape.sh

cp magic-tape.sh ~/.local/bin/

```

After that, the user must run this command in order to create the necessary directories:

```
mkdir -p ~/.cache/magic-tape/history/ ~/.cache/magic-tape/jpg/ ~/.cache/magic-tape/json/ ~/.cache/magic-tape/search/video/

mkdir -p ~/.cache/magic-tape/search/channels/ ~/.cache/magic-tape/subscriptions/jpg/ ~/.config/magic-tape/
```


Copy `png/` directory to `~/.cache/magic-tape/`

```
cp -r png/ ~/.cache/magic-tape/png/
```


Now, run with `kitty`:

```
kitty -T magic-tape magic-tape.sh
```

or any other terminal emulator:

```
magic-tape.sh
```

## Usage

### Set up

While using the script for the first time, the user will be asked for his preferences:
* __Prefered action Selector__, can either be `rofi`,`fzf` or `dmenu`.

* __Prefered web browser__, the cookies of which will be used by magic-tape in order to extract data from YouTube. Supported browsers by yt-dlp are brave, chrome, chromium, edge, firefox, opera, vivaldi.

* __Prefered video list length__ to get in each request. Longer video lists may be more preferable, but take longer to get.

* __Dialog message delay time__: the time a message in the cli window remains visible, in seconds.

* __Notification message delay time__: the time a notification remains visible, in seconds.

* __Image Support__: either __kitty__, __ueberzug__ or __none__.

* Toggle __multi-color__ terminal messages.

The user can always alter these preferences using the __P option__ of the __Miscellaneous Menu__.

### Import Subscribed channels

When the script is run for the first time, it would be advisable for the user to __import their subcsribed channels from YouTube__.

The user user can do that by navigating to the Miscellaneous Menu _(option m)_, then selecting __Import Subscriptions from YouTube__ _(option I)_.

### Main Menu
Once the program is run, the user is presented with the __Main Menu:__

![image 1](screenshots/homemenu.png)

Entering the respective key, the user can :

|key| Action|
|--|--|
|f|Browse their Subscriptions __Feed__.|
|t|Browse YouTube __Trending__ Feed.
|s|__Search__ for a key word/phrase|
|r|__Repeat__ previous selection.|
|c|Select a Subscribed __Channel Feed__.|
|l|Browse __Liked__ Videos.|
|h|Browse __Watch History__.|
|j|Browse __Search History__.|
|m|Open __Miscellaneous Menu__.|
|q|__Quit__ the program.|

* In order for the __f & t__ option to function, the user must already be logged in to their browser.

* Selecting __channel feed__, Browsing __watch history, search history & liked videos__ is done with __rofi__:

![image 2](screenshots/rofi_c_option.png){height=320}

![image 3](screenshots/rofi_h_option.png){height=320}

![image 4](screenshots/rofi_l_option.png){height=320}

![image 5](screenshots/rofi_j_option.png){height=320}


### Video selection

Video selection is done with __fzf__:

![image 6](screenshots/fzf1.png){height=450}

### Search shortcuts

|Shortcut|Function|
|---|---|
|Enter, Right Arrow|Accept|
|Esc|Abort Selection|
|Shift+Right Arrow|Next Page|
|Shift+Left Arrow|Previous Page|

Once a video is selected, the user is prompted to __select action__:

* Play ⭐Video 360p

* Play ⭐⭐Video 720p

* Play ⭐⭐⭐Best Video/Live

* Play ⭐⭐⭐Best Audio

* Download Video 🔽

* Download Audio 🔽

* Like Video ❤️

* Browse Feed of channel that uploaded the video  📺


* Subscribe to the channel that uploaded the video 📋


* Open in browser 🌐


* Copy link 🔗


* Quit ❌

![image7](screenshots/rofi_select_action.png){height=320}

Audio & Video files will be downloaded at  `~/Desktop/`

### Miscellaneous Menu
The __m option__ of the Main Menu opens up the __Miscellaneous Menu__:

![image 8](screenshots/2.png){height=320}

Entering the respective key, the user can :

|key| Action|
|--|--|
|P|__Set Up__ Preferences|
|l|__LIKE__ a video.|
|L|__UNLIKE__ a video.|
|I|__Import subscriptions__ from YouTube.|
|n|__Subscribe__ to a new channel.|
|u|__Unsubscribe__ to a new channel.|
|H|Clear __watch history__.|
|S|Clear __search  history__.|
|T|Clear __thumbnail cache.__|
|q|__Quit__ this menu, __Return__ to Main Menu.

### Subscribing to a new channel

Selecting the __n option__ of the Miscellaneous Menu, the user can subscribe to a new channel.

Initially, the user is asked to enter a keyword / keyphrase to search channels with.

Channel selection then is made with __fzf__:

![image 9](screenshots/fzf2.png){height=320}

* In the __n & u options__ of the Miscellaneous Menu (subcribe/unsubscribe to a channel), after a selection, the user will be asked to sync the changes manually to their YouTube account.

* __Liking/Unliking a video and unsubscribing from a channel options__ are done with __rofi__:

![image 10](screenshots/misc_l.png){height=320}

![image 11](screenshots/misc_L.png){height=320}

![image 12](screenshots/misc_u.png){height=320}

---

**<u>UPDATES</u>**:

1. The directory structure of the program has been updated. Instead of keeping everything in `~git/magic-tape/`, now various files and directories are kept in various places.This way,
  * the `magic-tape.sh` is in `~/.local/bin/`
  * the magic-tape cache files are all in `~/.cache/magic-tape/`
  * the configuration text file will be created in `~/.config/magic-tape/`
2. The action selection can be either with `rofi`, or `fzf` (if the user wants to go full TUI).This can be configured during the **P option** of the **misc menu**.
3. `dmenu` is also added as an action selector. This can be configured during the **P option** of the **misc menu**.
4. There is now a **duration filter prompt** in the **search** and **search history** option:

![filter.png](screenshots/filter.png)

---
