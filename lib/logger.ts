export default function logger(type = "ok", message = "") {
    const colors: { [key: string]: string } = {
        ok: "\x1b[32m",
        warn: "\x1b[33m",
        fail: "\x1b[31m",
        clear: "\x1b[0m",
    };

    console.log(`[ ${colors[type]}${type}${colors["clear"]} ] ${message}`);
}
