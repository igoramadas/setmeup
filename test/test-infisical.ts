// TEST: INFISICAL

import {after, afterEach, before, describe, it} from "mocha"
import assert from "node:assert/strict"

describe("SetMeUp Infisical Tests", function () {
    const originalFetch = globalThis.fetch
    const connection = {clientId: "client-id", clientSecret: "client-secret", projectId: "project-id"}
    let calls: {url: URL; init: RequestInit}[] = []
    let setmeup = null

    // Mock fetch, replying to the login and then to the actual API call.
    const mockFetch = (body: any, status: number = 200) => {
        calls = []
        const responses = [Response.json({accessToken: "access-token"}), new Response(JSON.stringify(body), {status: status})]
        globalThis.fetch = async (url: any, init?: RequestInit) => {
            calls.push({url: new URL(String(url)), init: init})
            return responses.shift()
        }
    }

    before(function () {
        require("anyhow").setup("none")
        setmeup = require("../src/index").newInstance()
    })

    afterEach(function () {
        globalThis.fetch = originalFetch
    })

    after(function () {
        delete process.env.SMU_INFISICAL_CLIENT_ID
    })

    it("Does nothing without a client ID", async function () {
        mockFetch({})
        assert.equal(await setmeup.loadFromInfisical(), null)
        assert.equal(calls.length, 0)
    })

    it("Requires the client secret and project ID", async function () {
        process.env.SMU_INFISICAL_CLIENT_ID = "client-id"
        await assert.rejects(setmeup.loadFromInfisical(), /clientSecret and projectId/)
        await assert.rejects(setmeup.saveToInfisical({a: 1}, {clientId: "client-id", projectId: "project-id"}), /clientSecret and projectId/)
        delete process.env.SMU_INFISICAL_CLIENT_ID
        await assert.rejects(setmeup.saveToInfisical({a: 1}), /clientId is required/)
    })

    it("Load settings from Infisical", async function () {
        mockFetch({
            secrets: [
                {secretKey: "service_urlBackend", secretValue: "https://backend"},
                {secretKey: "service_port", secretValue: "8080"},
                {secretKey: "service_enabled", secretValue: "true"},
                {secretKey: "service_hosts", secretValue: '["a","b"]'},
                {secretKey: "service_label", secretValue: "[not json]"},
                {secretKey: "constructor_prototype_polluted", secretValue: "yes"}
            ],
            imports: [
                {
                    secrets: [
                        {secretKey: "service_urlBackend", secretValue: "imported"},
                        {secretKey: "imported_key", secretValue: "abc"}
                    ]
                }
            ]
        })

        const result = await setmeup.loadFromInfisical({...connection, environment: "staging", secretPath: "/app"})

        assert.deepEqual(result, {service: {urlBackend: "https://backend", port: 8080, enabled: true, hosts: ["a", "b"], label: "[not json]"}, imported: {key: "abc"}})
        assert.equal(setmeup.settings.service.urlBackend, "https://backend")
        assert.equal(({} as any).polluted, undefined)

        assert.equal(calls[0].url.href, "https://app.infisical.com/api/v1/auth/universal-auth/login")
        assert.deepEqual(JSON.parse(String(calls[0].init.body)), {clientId: "client-id", clientSecret: "client-secret"})
        assert.equal(calls[1].url.pathname, "/api/v4/secrets")
        assert.equal(calls[1].url.searchParams.get("environment"), "staging")
        assert.equal(calls[1].url.searchParams.get("secretPath"), "/app")
        assert.equal(new Headers(calls[1].init.headers).get("Authorization"), "Bearer access-token")
    })

    it("Save settings to Infisical", async function () {
        mockFetch({secrets: []})

        const keys = await setmeup.saveToInfisical({service: {urlBackend: "https://new", port: 9090, hosts: ["c"], empty: null}, debug: false}, {...connection, siteUrl: "https://eu.infisical.com"})

        assert.deepEqual(keys, ["service_urlBackend", "service_port", "service_hosts", "debug"])
        assert.equal(setmeup.settings.service.urlBackend, "https://new")
        assert.equal(calls[1].url.href, "https://eu.infisical.com/api/v4/secrets/batch")
        assert.equal(calls[1].init.method, "PATCH")
        assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
            projectId: "project-id",
            environment: "prod",
            secretPath: "/",
            mode: "upsert",
            secrets: [
                {secretKey: "service_urlBackend", secretValue: "https://new"},
                {secretKey: "service_port", secretValue: "9090"},
                {secretKey: "service_hosts", secretValue: '["c"]'},
                {secretKey: "debug", secretValue: "false"}
            ]
        })
    })

    it("Fails when Infisical rejects the request", async function () {
        mockFetch("Forbidden", 403)
        await assert.rejects(setmeup.loadFromInfisical(connection), /Infisical GET \/api\/v4\/secrets failed: 403/)
    })
})
