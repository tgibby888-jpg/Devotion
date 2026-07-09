#!/usr/bin/env bash
cd /home/team/shared/site
bash ./publish.sh > /tmp/chat_publish.txt 2>&1
echo "DONE: $?" >> /tmp/chat_publish.txt