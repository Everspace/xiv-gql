import fs from "fs"
import path from "path"
import yaml from "yaml"

export const joinalize = (...paths: string[]) => {
  return path.normalize(path.join(...paths))
}
export const loadYaml = <T>(...paths: string[]) => {
  const file = fs.readFileSync(joinalize(...paths), "utf8")
  return yaml.parseDocument(file, { schema: "core" })
}
