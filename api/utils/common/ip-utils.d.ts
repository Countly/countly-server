/**
 * Module for IP address utility functions
 * @module api/utils/common/ip-utils
 */

declare module "api/utils/common/ip-utils" {
  import { IncomingMessage } from "http";

  /**
   * Get IP address from request object
   * @param {req} req - nodejs request object
   * @returns {string} ip address
   */
  export function getIpAddress(req: IncomingMessage): string;

  /**
   *  This function takes ipv4 or ipv6 with possible port, removes port information and returns plain ip address
   *  @param {string} ip - ip address to check for port and return plain ip
   *  @returns {string} plain ip address
   */
  export function stripPort(ip: string): string;
}
