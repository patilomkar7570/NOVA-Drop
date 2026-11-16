using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Net.NetworkInformation;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace NovaDropLauncher
{
    class Program
    {
        private static Process serverProcess = null;
        private static Process windowProcess = null;

        [DllImport("Kernel32")]
        private static extern bool SetConsoleCtrlHandler(EventHandler handler, bool add);

        private delegate bool EventHandler(CtrlType sig);
        private static EventHandler exitHandler;

        private enum CtrlType
        {
            CTRL_C_EVENT = 0,
            CTRL_BREAK_EVENT = 1,
            CTRL_CLOSE_EVENT = 2,
            CTRL_LOGOFF_EVENT = 5,
            CTRL_SHUTDOWN_EVENT = 6
        }

        private static bool Handler(CtrlType sig)
        {
            Cleanup();
            return false;
        }

        private static void Cleanup()
        {
            try
            {
                if (serverProcess != null && !serverProcess.HasExited)
                {
                    serverProcess.Kill();
                }
            }
            catch { }

            try
            {
                if (windowProcess != null && !windowProcess.HasExited)
                {
                    windowProcess.Kill();
                }
            }
            catch { }
        }

        [STAThread]
        static void Main(string[] args)
        {
            exitHandler = new EventHandler(Handler);
            SetConsoleCtrlHandler(exitHandler, true);
            AppDomain.CurrentDomain.ProcessExit += (s, e) => Cleanup();

            string appDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            Directory.SetCurrentDirectory(appDir);

            // Locate node.exe: check bundled runtime first, then system PATH
            string nodePath = Path.Combine(appDir, "runtime", "node.exe");
            if (!File.Exists(nodePath))
            {
                nodePath = Path.Combine(appDir, "node.exe");
            }
            if (!File.Exists(nodePath))
            {
                nodePath = "node"; // fallback to system PATH
            }

            // Locate server script
            string serverScript = Path.Combine(appDir, "server", "dist", "server.js");
            if (!File.Exists(serverScript))
            {
                serverScript = Path.Combine(appDir, "dist", "server.js");
            }

            // Find Local Wi-Fi IPv4 address
            string localIp = GetLocalIpAddress();
            string localUrl = "http://localhost:3000";
            string wifiUrl = "http://" + localIp + ":3000";

            // Automatically copy Wi-Fi URL to Clipboard so user can immediately paste it on their phone
            try
            {
                Clipboard.SetText(wifiUrl);
            }
            catch { }

            // Launch Node Server in Background (Zero console window)
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nodePath;
                psi.Arguments = "\"" + serverScript + "\"";
                psi.WorkingDirectory = appDir;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.EnvironmentVariables["PORT"] = "3000";
                psi.EnvironmentVariables["HOST"] = "0.0.0.0";

                serverProcess = Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Failed to start local NOVA Drop engine:\n\n" + ex.Message,
                    "NOVA Drop Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // Wait brief moment for server to listen
            Thread.Sleep(900);

            // Locate browser executable for standalone application window (no address bar, no tabs)
            string appBrowserPath = FindStandaloneBrowser();
            string dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NOVA-Drop", "webview");

            if (!string.IsNullOrEmpty(appBrowserPath))
            {
                try
                {
                    ProcessStartInfo appPsi = new ProcessStartInfo();
                    appPsi.FileName = appBrowserPath;
                    appPsi.Arguments = "--app=\"" + localUrl + "\" --user-data-dir=\"" + dataDir + "\" --window-size=1260,840";
                    appPsi.UseShellExecute = false;

                    windowProcess = Process.Start(appPsi);
                }
                catch
                {
                    // Fallback to default shell launch if app mode fails
                    try
                    {
                        Process.Start(new ProcessStartInfo(localUrl) { UseShellExecute = true });
                    }
                    catch { }
                }
            }
            else
            {
                // Fallback to default browser
                try
                {
                    Process.Start(new ProcessStartInfo(localUrl) { UseShellExecute = true });
                }
                catch { }
            }

            // Wait for standalone window to close, then cleanly terminate server
            if (windowProcess != null)
            {
                windowProcess.WaitForExit();
                Cleanup();
            }
            else if (serverProcess != null)
            {
                serverProcess.WaitForExit();
            }
        }

        private static string FindStandaloneBrowser()
        {
            // Edge 64-bit and 32-bit locations
            string edge1 = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (File.Exists(edge1)) return edge1;

            string edge2 = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            if (File.Exists(edge2)) return edge2;

            // Chrome locations
            string chrome1 = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (File.Exists(chrome1)) return chrome1;

            string chrome2 = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
            if (File.Exists(chrome2)) return chrome2;

            return null;
        }

        private static string GetLocalIpAddress()
        {
            try
            {
                foreach (NetworkInterface ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (ni.OperationalStatus != OperationalStatus.Up) continue;
                    if (ni.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;

                    IPInterfaceProperties props = ni.GetIPProperties();
                    foreach (UnicastIPAddressInformation ip in props.UnicastAddresses)
                    {
                        if (ip.Address.AddressFamily == AddressFamily.InterNetwork)
                        {
                            string s = ip.Address.ToString();
                            if (s.StartsWith("192.168.") || s.StartsWith("10.") || s.StartsWith("172."))
                            {
                                return s;
                            }
                        }
                    }
                }

                using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0))
                {
                    socket.Connect("8.8.8.8", 65530);
                    IPEndPoint endPoint = socket.LocalEndPoint as IPEndPoint;
                    if (endPoint != null)
                    {
                        return endPoint.Address.ToString();
                    }
                }
            }
            catch { }

            return "127.0.0.1";
        }
    }
}
