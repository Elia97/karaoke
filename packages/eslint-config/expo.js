import baseConfig from "./base.js"
import expoConfig from "eslint-config-expo/flat.js"
import { defineConfig } from "eslint/config"

export default defineConfig([...baseConfig, ...expoConfig])
