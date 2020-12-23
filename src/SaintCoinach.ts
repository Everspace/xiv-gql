import fs from "fs"
import csv from "csv"
import lodash, { zip } from "lodash"

export const csvParse = async <T = string[]>(filepath: string, opts?: any) => {
  const file = await fs.promises.readFile(filepath, { encoding: "utf-8" })
  return new Promise<T[]>((resolve, reject) => {
    //@ts-ignore csv.parse has weird definitions
    csv.parse(file, opts, (err, records, info) => {
      if (err) reject(err)
      resolve(records)
    })
  })
}

const cleanTypeNames = (s: string) => {
  if (s.startsWith("bit&")) return "bit"
  return s
}

type GQLBasicTypes = "Boolean!" | "Int!" | "String!"
const GQL_TYPE_MAPPINGS: any = {
  bit: "Boolean!",
  bool: "Boolean!",
  byte: "Int!",
  int16: "Int!",
  int32: "Int!",
  int64: "Int!",
  sbyte: "Int!",
  single: "Boolean!",
  str: "String!",
  uint16: "Int!",
  uint32: "Int!",
}

const applyGqlTypeMappings = (typeName: string) => {
  const result = GQL_TYPE_MAPPINGS[typeName]
  if (result === undefined) return typeName
  return result
}

export async function coinachCsv(f: string) {
  const { columnNames, columnTypes } = await coinachCsvHeaders(f)
  const documentValues = await csvParse<string[]>(f, {
    from: 4,
  })

  const json: Record<string, Record<string, any>> = documentValues.reduce(
    (doc, values) => {
      const id = values[0]
      const result: any = {}
      for (const [name, value, type] of zip(columnNames, values, columnTypes)) {
        if (name === undefined) {
          throw `${f} resulted in a wonky ${name} ${value} ${type}`
        }
        switch (type) {
          case "Boolean!":
            result[name] = Number(value) === 1 ? true : false
            continue
          case "Int!":
            result[name] = Number(value)
            continue
          case "String!":
          default:
            result[name] = value
            continue
        }
      }
      // IDs are all strings shhhhhhh
      result[id] = id
      doc[id] = result
      return doc
    },
    {} as any,
  )

  return { json, columnNames, columnTypes }
}

export async function coinachCsvHeaders(f: string) {
  const [columnNumbers, columnNames, types] = await csvParse<string[]>(f, {
    to: 3,
  })
  if (
    columnNumbers === undefined ||
    columnNames === undefined ||
    types === undefined
  ) {
    console.log(`${f} failed to parse csv`)
  }

  const results = lodash
    .zip(columnNumbers, columnNames)
    .map(([number, name]) => {
      if (name === undefined || name === "") {
        return `UnknownColumn${number}`
      }
      return name
    })
    .map((columnName) => columnName.replace(/[{}<>]/g, ""))

  return {
    columnNames: results,
    columnTypes: types.map(cleanTypeNames).map(applyGqlTypeMappings),
  }
}
