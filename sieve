#!/bin/bash
# ------------------------------------------------------------------------------ 
# SOME INFOS : fairly standard (debian) init script.
#                 Note that node doesn't create a PID file (hence --make-pidfile) 
#                 has to be run in the background (hence --background)
#                 and NOT as root (hence --chuid)
#
# MORE INFOS :  INIT SCRIPT       http://www.debian.org/doc/debian-policy/ch-opersys.html#s-sysvinit
#               INIT-INFO RULES   http://wiki.debian.org/LSBInitScripts
#               INSTALL/REMOVE    http://www.debian-administration.org/articles/28
# ------------------------------------------------------------------------------
#                                                                              #
#                     BEGIN <MODIFY TO REFLECT YOUR SETTINGS>                  #
#                                                                              #
#
#  1) Don't forget to also modify the COMMENTED fields in the "### BEGIN INIT INFO"
#     below (don't uncomment them) if you wish to install system-wide with update-rc.d
#     eg: provides, Short-Description, Description
#
#  2) in case you have different node.js servers running, each init.d script should
#     (obviously) have a UNIQUE BASE name so that PIDS do not conflict
#     --> name them accordingly
#     eg: node_static_server, node_express1, node_load_balancer.sh...
#
#  3) copy the renamed/modified script(s) to /etc/init.d
#     chmod 755,
#
#  4) if you wish the Daemon to be lauched at boot / stopped at shutdown :
#     INSTALL : update-rc.d scriptname defaults 
#     (UNINSTALL : update-rc.d -f  scriptname remove)
#
#  5)  based on : Debian /etc/init.d/skeleton
#      modified by : Peter Host (www.oghme.com)
# ______________________________________________________________________________ 
### BEGIN INIT INFO
# Provides:          sieve
# Required-Start:    $remote_fs $named $syslog
# Required-Stop:     $remote_fs $named $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: sieve
# Description:       sieve
### END INIT INFO

# Author: Ben Hutchison <ben@bluejeansnet.com>
#
# ______________________________________________________________________________ 
#

DESC="sieve"                                # whatever fancy description you like

DAEMON_ARGS="/opt/sieve/index.js"           # path to your node.js server/app
											# NB: don't use ~/ in path

NAME=node                                   # name of the node.js executable
DAEMON=/usr/bin/$NAME                       # this SHOULD POINT TO where your node executable is

NODEUSER=nobody:nogroup                     # USER who OWNS the daemon process (no matter whoever runs the init script)
											# user:group (if no group is specified, the primary GID for that user is used)

PATH=/sbin:/usr/sbin:/bin:/usr/bin:/usr/local/bin # modify if you need
LOCAL_VAR_RUN=/usr/local/var/run            # in case the init script is run by non-root user, you need to
											# indicate a directory writeable by $NODEUSER to store the PID file
											# NB : 1) /usr/local/var/run does not exist by DEFAULT. Either create it
											#      or choose one of your own liking.
											#      2) node, npm,... are best NOT installed/run as ROOT.
											#         (see here: https://github.com/isaacs/npm/blob/master/README.md)
#
#                                                                              #
#                   END </MODIFY TO REFLECT YOUR SETTINGS>                     #
#                (Nothing else to modify from this point on...)                #
# ------------------------------------------------------------------------------ 





# Do NOT "set -e"

[ $UID -eq "0" ] && LOCAL_VAR_RUN=/var/run # in case this script is run by root, override user setting
THIS_ARG=$0
INIT_SCRIPT_NAME=`basename $THIS_ARG`
[ -h $THIS_ARG ] && INIT_SCRIPT_NAME=`basename $(readlink $THIS_ARG)` # in case of symlink
INIT_SCRIPT_NAME_NOEXT=${INIT_SCRIPT_NAME%.*}                            
PIDFILE="$LOCAL_VAR_RUN/$INIT_SCRIPT_NAME_NOEXT.pid"
SCRIPTNAME=/etc/init.d/$INIT_SCRIPT_NAME

# Exit if the package is not installed
[ -x "$DAEMON" ] ||  { echo "can't find Node.js ($DAEMON)"  >&2; exit 0; }

# Exit if the 'run' folder is not present
[ -d "$LOCAL_VAR_RUN" ] || { echo "Directory $LOCAL_VAR_RUN does not exist. Modify the '$INIT_SCRIPT_NAME_NOEXT' init.d script ($THIS_ARG) accordingly" >&2; exit 0; }

# Read configuration variable file if it is present
[ -r /etc/default/$INIT_SCRIPT_NAME ] && . /etc/default/$INIT_SCRIPT_NAME

# Load the VERBOSE setting and other rcS variables
. /lib/init/vars.sh

# Define LSB log_* functions.
# Depend on lsb-base (>= 3.0-6) to ensure that this file is present.
. /lib/lsb/init-functions

# uncomment to override system setting
# VERBOSE=yes

#
# Function that starts the daemon/service
#
do_start()
{
	# Return
	#   0 if daemon has been started
	#   1 if daemon was already running
	#   2 if daemon could not be started
	log_daemon_msg "starting $DESC"
	start-stop-daemon --start --quiet --pidfile $PIDFILE --chuid $NODEUSER --background --exec $DAEMON --test > /dev/null \
		|| { log_progress_msg "already started"; log_end_msg 1; return 1; }
	start-stop-daemon --start --make-pidfile --pidfile $PIDFILE --background --exec $DAEMON -- $DAEMON_ARGS  \
		|| { [ "$VERBOSE" != no ] && log_daemon_msg  "could not start $DESC" "$INIT_SCRIPT_NAME_NOEXT"; return 2; }
	# Add code here, if necessary, that waits for the process to be ready
	# to handle requests from services started subsequently which depend
	# on this one.  As a last resort, sleep for some time.
	log_progress_msg "started with pid `cat $PIDFILE`"
	log_end_msg 0
}

do_stop(){
		pidofproc -p "$PIDFILE" "$DAEMON" > /dev/null
	if [ "$?" = "0" ]; then
		log_daemon_msg "stopping $DESC"
		killproc -p "$PIDFILE" "$DAEMON"
		log_progress_msg "stopped"
	else
		log_begin_msg "$DESC not started"
	fi
	log_end_msg 0

	if [ "$?" = "1" ]; then
		rm "$PIDFILE"
	fi
}

do_status() {
  status_of_proc -p "$PIDFILE" "$DAEMON" "$DESC"
}

running() {
  RUNSTAT=$(start-stop-daemon --start --quiet --pidfile $PIDFILE --chuid $NODEUSER --background --exec $DAEMON --test > /dev/null)
  if [ "$?" = 1 ]; then
	echo y
  fi
  
}


case "$1" in
  start)
	[ "$VERBOSE" != no ] && log_daemon_msg "Starting $DESC" "$INIT_SCRIPT_NAME_NOEXT"
	do_start
	case "$?" in
		0|1) [ "$VERBOSE" != no ] && log_end_msg 0 ;;
		2) [ "$VERBOSE" != no ] && log_end_msg 1 ;;
	esac
	;;
  stop)
	[ "$VERBOSE" != no ] && log_daemon_msg "Stopping $DESC" "$INIT_SCRIPT_NAME_NOEXT"
	do_stop
	case "$?" in
		0|1) [ "$VERBOSE" != no ] && log_end_msg 0 ;;
		2) [ "$VERBOSE" != no ] && log_end_msg 1 ;;
	esac
	;;
  restart)
	do_stop
	case "$?" in
	  0|1)
		do_start
		case "$?" in
				0) ;;
			1) log_end_msg 1 ;; # Old process is still running
			*) log_end_msg 1 ;; # Failed to start
		esac
		;;
	  *)
		# Failed to stop
		log_end_msg 1
		;;
	esac
	;;
  status)
	do_status
  ;;
  *)
	echo "Usage: $SCRIPTNAME {start|stop|restart}" >&2
	exit 3
	;;
esac

exit 0
