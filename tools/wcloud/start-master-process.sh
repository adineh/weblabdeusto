#!/bin/bash

source config.sh

if [ $UID != 0 ]; then
    echo "Error: run $0 as root"
    exit -1
fi

nohup ./scripts/admin_worker.sh > nohup_admin_worker &

/etc/init.d/apache2 reload

su $USER_ACCOUNT -c "cd $(pwd) && ./user-processes.sh"

