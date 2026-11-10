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
        }

        [STAThread]
        static void Main(string[] args)
        {
            exitHandler = new EventHandler(Handler);
            SetConsoleCtrlHandler(exitHandler, true);
            AppDomain.CurrentDomain.ProcessExit += (s, e) => Cleanup();

            try
            {
                Console.Title = "NOVA Drop — Privacy-First File Transfer (v1.0.0)";
            }
            catch { }

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

            // Print Banner
            Console.ForegroundColor = ConsoleColor.Magenta;
            Console.WriteLine(@"
   _  ______  _  _____       ___                 
  / |/ / __ \/ |/ / _ | ____/ _ \_______  ___    
 /    / /_/ /    / __ |/___/ // / __/ _ \/ _ \   
/_/|_/\____/_/|_/_/ |_|   /____/_/  \___/ .__/   
                                       /_/       ");
            Console.ResetColor();

            Console.WriteLine("========================================================================");
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("  NOVA Drop — Standalone Edition (v1.0.0)");
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.WriteLine("  \"Your files. Your devices. Your network.\"");
            Console.ResetColor();
            Console.WriteLine("========================================================================");
            Console.WriteLine();

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("  [+] Privacy & Security Status:");
            Console.ResetColor();
            Console.WriteLine("      * Cloud Sync:  DISABLED (100% Local Device Operation)");
            Console.WriteLine("      * Compression: DISABLED (Byte-for-byte fidelity, SHA-256 verified)");
            Console.WriteLine("      * Telemetry:   DISABLED (Zero tracking, zero accounts)");
            Console.WriteLine();

            Console.WriteLine("  ----------------------------------------------------------------------");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("  [1] Local PC Browser Access:");
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("      " + localUrl);
            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("  [2] Mobile / Wi-Fi Transfer URL (Phones, Tablets & Other PCs):");
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("      " + wifiUrl);
            Console.ResetColor();
            Console.WriteLine("  ----------------------------------------------------------------------");
            Console.WriteLine();

            // Copy Wi-Fi URL to Clipboard
            try
            {
                Clipboard.SetText(wifiUrl);
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("  [v] Mobile URL automatically copied to your clipboard!");
                Console.ResetColor();
            }
            catch
            {
                // Clipboard might fail in rare environments; ignore
            }

            // Launch Server Process
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
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("  [!] Failed to start local server: " + ex.Message);
                Console.ResetColor();
                Console.WriteLine("  Press any key to exit...");
                Console.ReadKey();
                return;
            }

            // Open default browser after brief pause for server initialization
            Thread.Sleep(800);
            try
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("  [v] Opening NOVA Drop in your default web browser...");
                Console.ResetColor();
                Process.Start(new ProcessStartInfo(localUrl) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine("  [!] Could not open browser automatically: " + ex.Message);
            }

            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("  How to connect to another phone or tablet on the same Wi-Fi:");
            Console.ForegroundColor = ConsoleColor.Gray;
            Console.WriteLine("  1. Connect your phone or tablet to the same Wi-Fi network.");
            Console.WriteLine("  2. Open Safari / Chrome and paste the URL: " + wifiUrl);
            Console.WriteLine("     (Or open the NOVA Drop Android APK).");
            Console.WriteLine("  3. Transfer files at maximum Wi-Fi speed with zero quality loss!");
            Console.ResetColor();
            Console.WriteLine();
            Console.WriteLine("========================================================================");
            Console.ForegroundColor = ConsoleColor.DarkYellow;
            Console.WriteLine("  Server is active. Press Ctrl+C or close this window to exit.");
            Console.ResetColor();
            Console.WriteLine("========================================================================");

            // Wait for exit
            if (serverProcess != null)
            {
                serverProcess.WaitForExit();
            }
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

                // Fallback using UDP socket connect
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
