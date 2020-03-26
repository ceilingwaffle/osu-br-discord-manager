# run as root
NODEUSER=waffle

# setup permissions - https://stackoverflow.com/a/54903098
sudo addgroup nodecert
sudo adduser $NODEUSER nodecert
sudo adduser root nodecert

sudo chgrp nodecert /etc/letsencrypt/live
sudo chgrp nodecert /etc/letsencrypt/archive

sudo chmod 710 /etc/letsencrypt/live
sudo chmod 710 /etc/letsencrypt/archive
# -----------my shit below----------------
sudo chgrp -Rh nodecert /etc/letsencrypt/live
sudo chgrp -R nodecert /etc/letsencrypt/archive
sudo chmod -R 710 /etc/letsencrypt/live
sudo chmod -R 710 /etc/letsencrypt/archive

# Give Safe User Permission To Use Ports < 1024 - https://stackoverflow.com/a/23281417
sudo apt-get install libcap2-bin
sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``
