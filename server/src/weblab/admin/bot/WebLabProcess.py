#!/usr/bin/python
# -*- coding: utf-8 -*-
#
# Copyright (C) 2005-2009 University of Deusto
# All rights reserved.
#
# This software is licensed as described in the file COPYING, which
# you should have received as part of this distribution.
#
# This software consists of contributions made by many individuals, 
# listed below:
#
# Authors: Jaime Irurzun <jaime.irurzun@gmail.com>
#          Pablo Orduña <pablo@ordunya.com>
#

import os
import subprocess
import time
import urllib2
import copy
import voodoo.killer as killer

LAUNCH_DIR = os.sep.join(('..','launch'))

class WebLabProcess(object):

    def __init__(self, weblab_path, launch_file, host, ports):
        # ports = { "soap" : (10123, 20123), "xmlrpc" : (...) ...}
        super(WebLabProcess, self).__init__()
        self.weblab_path = list(weblab_path)
        self.launch_file = launch_file
        self.host        = host
        self.ports       = ports
        self._set_paths()
        
    def _set_paths(self):
        launch_path = copy.copy(self.weblab_path)
        launch_path.append(LAUNCH_DIR)
        self.launch_path = os.path.abspath( os.sep.join(launch_path) )
        
    def _has_started(self):
        try:
            matches = True

            for port in self.ports['soap']:
                current_content = urllib2.urlopen('http://%s:%s/weblab/soap/?WSDL' % (self.host, port)).read()
                matches &= current_content.find("definitions targetNamespace") > 0

            for port in self.ports['xmlrpc']:
                current_content = urllib2.urlopen('http://%s:%s/weblab/xmlrpc/' % (self.host, port)).read()
                matches &= current_content.find("XML-RPC service") > 0

            for port in self.ports['json']:
                current_content = urllib2.urlopen('http://%s:%s/weblab/json/' % (self.host, port)).read()
                matches &= current_content.find("JSON service") > 0

            for port in self.ports['soap_login']:
                current_content = urllib2.urlopen('http://%s:%s/weblab/login/soap/?WSDL' % (self.host, port)).read()
                matches &= current_content.find("definitions targetNamespace") > 0

            for port in self.ports['xmlrpc_login']:
                current_content = urllib2.urlopen('http://%s:%s/weblab/login/xmlrpc/' % (self.host, port)).read()
                matches &= current_content.find("XML-RPC service") > 0

            for port in self.ports['json_login']:
                current_content = urllib2.urlopen('http://%s:%s/weblab/login/json/' % (self.host, port)).read()
                matches &= current_content.find("JSON service") > 0

            return matches
        except Exception:
            return False
    
    def _has_finished(self):
        return self.popen.poll() is not None
    
    def start(self):
        self.popen = subprocess.Popen(["python", self.launch_file],
                                      cwd=self.launch_path,
                                      stdin=subprocess.PIPE,
                                      stdout=subprocess.PIPE,
                                      stderr=subprocess.PIPE)
        
        time.sleep(10)

        max_iterations = 10
        while not self._has_started() and max_iterations > 0:
            max_iterations -= 1
            time.sleep(4)
        if max_iterations == 0:
            if self.popen.poll() is not None:
                print self.popen.stdout.read()
                print self.popen.stderr.read()
            raise Exception("Server couldn't start!")
        self._wait_file_notifier(os.path.join(self.launch_path, "_file_notifier"))
        
    def _wait_file_notifier(self, filepath):
        while True:
            try:
                open(filepath)
            except IOError:
                time.sleep(0.1)
            else:
                break
        #time.sleep(1)
        
    def shutdown(self):
        if not self._has_finished():
            (self.out, self.err) = self.popen.communicate(input="\n")
            maxtime = 5 # seconds            
            time_expired = False
            initialtime = time.time()
            while not self._has_finished() and not time_expired:
                time.sleep(0.1)
                time_expired = time.time() > initialtime + maxtime
            if time_expired:
                killer.term(self.popen)
                initialtime = time.time()
                while not self._has_finished() and not time_expired:
                    time.sleep(0.1)
                    time_expired = time.time() > initialtime + maxtime
                if time_expired:
                    killer.kill(self.popen)
        else:
            try:
                self.out = self.popen.stdout.read()
                self.err = self.popen.stderr.read()
            except Exception, e:
                self.out = "Couldn't read process output: %s" % e
                self.err = "Couldn't read process output: %s" % e

        self.result = self.popen.wait()
        return self.result
