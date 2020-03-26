# https://certbot.eff.org/lets-encrypt/ubuntubionic-other
sudo apt-get update
sudo apt-get install software-properties-common
sudo add-apt-repository universe
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update

sudo apt-get install certbot

# web server must be offline
sudo certbot certonly --standalone

# test
sudo certbot renew --dry-run
