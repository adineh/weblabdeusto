﻿using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Threading;
using System.Configuration;

namespace WebLab.VM.WindowsRDPVNC
{
    public partial class WindowsRDPService : ServiceBase
    {
        private RequestsListener mListener;
        private Thread mListenerThread;

        private string mPrefix = "";

        public WindowsRDPService()
        {
            InitializeComponent();
        }

        private void ReadConfigVars()
        {
            try
            {
                mPrefix = ConfigurationManager.AppSettings["request_prefix"];
            }
            catch (Exception ex)
            {
                Trace.WriteLine("Could not read the required configuration variables: " + ex.Message);
                return;
            }

            if (mPrefix == "")
            {
                Trace.WriteLine("request_prefix must be specified");
                return;
            }

            PasswordChangerManager.Instance.registerPasswordChangers(ConfigurationManager.AppSettings);

            Trace.WriteLine(String.Format("Prefix: {0}", mPrefix));
        }


        private void Run()
        {
            try
            {
                mListener = new RequestsListener(mPrefix);
                mListener.Run();
            }
            catch (Exception e)
            {
                Trace.WriteLine("Exception caught at main thread. Aborting. " + e.Message);
            }
        }

        protected override void OnStart(string[] args)
        {
            Trace.WriteLine("WindowsRDPService starting.");

            ReadConfigVars();

            try
            {
                mListenerThread = new Thread(new ThreadStart(this.Run));
                mListenerThread.Start();
            }
            catch (Exception e)
            {
                Trace.WriteLine("Exception caught at OnStart: " + e.Message);
            }
        }

        protected override void OnStop()
        {
            Trace.WriteLine("WindowsRDPService stopping.");

            // This is not particularly advisable, but shouldn't be too bad here.
            mListenerThread.Abort();
        }
    }
}
