#!/usr/bin/env bash
cd /home/team/shared/site
team-db "SELECT id, title, status FROM tasks WHERE assigned_to='agent-full-stack-engineer' ORDER BY status" > /tmp/mytasks.txt 2>&1