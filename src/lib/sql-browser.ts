import * as dgram from "dgram";

function discoverPort(host: string, instance: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");

    const timer = setTimeout(() => {
      socket.close();
      reject(new Error(`SQL Browser timeout — is the SQL Server Browser service running on ${host}?`));
    }, 5000);

    socket.on("message", (msg, rinfo) => {
      clearTimeout(timer);
      socket.close();

      // Reject replies from unexpected sources (basic UDP spoofing mitigation)
      if (rinfo.address !== host) {
        reject(new Error(`SQL Browser reply came from ${rinfo.address}, expected ${host}`));
        return;
      }

      const text = msg.toString("ascii");
      const match = text.match(/tcp;(\d+)/i);
      if (match) {
        const port = Number(match[1]);
        // Valid user-space port range
        if (port < 1024 || port > 65535) {
          reject(new Error(`SQL Browser returned suspicious port ${port}`));
          return;
        }
        resolve(port);
      } else {
        reject(new Error(`Instance "${instance}" not found in SQL Browser response from ${host}`));
      }
    });

    socket.on("error", (err) => {
      clearTimeout(timer);
      socket.close();
      reject(err);
    });

    // SQL Browser CLNT_UCAST_INST request: 0x04 + instance name
    const payload = Buffer.concat([
      Buffer.from([0x04]),
      Buffer.from(instance, "ascii"),
      Buffer.from([0x00]),
    ]);

    socket.send(payload, 1434, host, (err) => {
      if (err) { clearTimeout(timer); socket.close(); reject(err); }
    });
  });
}

/**
 * If DATABASE_URL contains a named instance (host\INSTANCE), queries the SQL
 * Browser service on UDP 1434 to discover the actual TCP port and returns the
 * resolved URL. If the URL already has an explicit port, returns it unchanged.
 */
export async function resolveDbUrl(url: string): Promise<string> {
  // Match: sqlserver://host\INSTANCE  (no explicit port)
  const match = url.match(/^(sqlserver:\/\/)([^\\;:]+)\\([^;:]+)/);
  if (!match) return url;

  const [full, proto, host, instance] = match;
  const port = await discoverPort(host, instance);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[sql-browser] ${host}\\${instance} → port ${port}`);
  }

  return url.replace(full, `${proto}${host}:${port}`);
}
