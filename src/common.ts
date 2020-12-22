import yaml from "yaml"
import path from "path"
import fs from "fs"

export const joinalize = (...paths: string[]) => {
  return path.normalize(path.join(...paths))
}
export const loadYaml = <T>(...paths: string[]) => {
  const file = fs.readFileSync(joinalize(...paths), "utf8")
  return yaml.parseDocument(file, { schema: "core" })
}
