import { createLogger, format, transports } from "winston";

const customFormat = format.printf(info => {
  return `[${new Date().toLocaleString()}] ${info.level.toUpperCase()}, ${
    info.message
  }`;
});

const logger = createLogger({
  transports: [
    new transports.File({
      filename: "log/" + dateToSimpleString(new Date()) + "-debug.log",
      level: "debug",
      //   format: format.combine(format.timestamp(), format.prettyPrint())
      format: format.combine(customFormat)
    }),
    new transports.File({
      filename: "log/" + dateToSimpleString(new Date()) + "-error.log",
      level: "error",
      //   format: format.combine(format.timestamp(), format.prettyPrint())
      format: format.combine(customFormat)
    })
  ]
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      level: "debug"
    })
  );
  logger.debug("Logging initialized at debug level");
}

export function log() {
  logger.log("debug", "");
}

export function add(transport: any): void {
  logger.add(transport);
}

function dateToSimpleString(date: Date): string {
  function pad(val: number): string {
    return val < 10 ? "0" + val : "" + val;
  }

  return (
    "" +
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

export default logger;
