#!/usr/bin/env bash
# publish and record status
cd /home/team/shared/site
bash ./publish.sh > /tmp/publish_status.txt 2>&1
echo "EXIT_CODE: $?" >> /tmp/publish_status.txt