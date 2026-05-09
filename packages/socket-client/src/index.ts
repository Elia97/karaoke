import { io, type Socket } from 'socket.io-client'

export function createSocketClient(url: string): Socket {
  return io(url, { autoConnect: false })
}
