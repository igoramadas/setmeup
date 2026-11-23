// TEST: INFISICAL

import {after, afterEach, before, describe, it} from "mocha"
import assert from "node:assert/strict"

describe("SetMeUp Infisical Tests", function () {
    const originalFetch = globalThis.fetch
    const connection = {clientId: "client-id", clientSecret: "client-secret", projectId: "project-id"}
    let calls: {url: URL; init: RequestInit}[] = []
    let setmeup = null

    // Mock fetch, replying to the login and then to each API call, in order.
    const mockFetch = (...bodies: any[]) => {
        calls = []
        const responses = [Response.json({accessToken: "access-token"}), ...bodies.map((body) => (body instanceof Response ? body : Response.json(body)))]
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
        mockFetch({secrets: [{secretKey: "service_port", secretValue: "9090"}], imports: [{secrets: [{secretKey: "debug", secretValue: "true"}]}]}, {secrets: []})

        const keys = await setmeup.saveToInfisical({service: {urlBackend: "https://new", port: 9090, hosts: ["c"], empty: null}, debug: false}, {...connection, siteUrl: "https://eu.infisical.com"})

        assert.deepEqual(keys, ["service_urlBackend", "service_hosts", "debug"])
        assert.equal(setmeup.settings.service.urlBackend, "https://new")
        assert.equal(calls[1].url.href.split("?")[0], "https://eu.infisical.com/api/v4/secrets")
        assert.equal(calls[2].url.href, "https://eu.infisical.com/api/v4/secrets/batch")
        assert.equal(calls[2].init.method, "PATCH")
        assert.equal(new Headers(calls[2].init.headers).get("Authorization"), "Bearer access-token")
        assert.deepEqual(JSON.parse(String(calls[2].init.body)), {
            projectId: "project-id",
            environment: "prod",
            secretPath: "/",
            mode: "upsert",
            secrets: [
                {secretKey: "service_urlBackend", secretValue: "https://new"},
                {secretKey: "service_hosts", secretValue: '["c"]'},
                {secretKey: "debug", secretValue: "false"}
            ]
        })
    })

    it("Skip saving unchanged values", async function () {
        mockFetch({secrets: [{secretKey: "service_port", secretValue: "9090"}]})

        assert.deepEqual(await setmeup.saveToInfisical({service: {port: 9090}}, connection), [])
        assert.equal(calls.length, 2)
        assert.deepEqual(await setmeup.saveToInfisical({empty: null}, connection), [])
    })

    it("Save changes pending approval", async function () {
        mockFetch({secrets: []}, {approval: {id: "approval-id"}})
        assert.deepEqual(await setmeup.saveToInfisical({service: {approved: false}}, connection), ["service_approved"])
    })

    it("Refuse to replace existing nested secrets", async function () {
        mockFetch({secrets: [{secretKey: "service_ports_http", secretValue: "80"}]})
        await assert.rejects(setmeup.saveToInfisical({service: {ports: [443]}}, connection), /override the saved values, remove them first: service_ports_http/)
        assert.equal(calls.length, 2)
    })

    it("Refuse to save values with edge whitespace", async function () {
        mockFetch()
        await assert.rejects(setmeup.saveToInfisical({password: "pass "}, connection), /leading or trailing whitespace: password/)
        assert.equal(calls.length, 0)
    })

    it("Require HTTPS except for localhost", async function () {
        await assert.rejects(setmeup.loadFromInfisical({...connection, siteUrl: "http://infisical.example.com"}), /must use HTTPS/)

        mockFetch({secrets: []})
        assert.equal(await setmeup.loadFromInfisical({...connection, siteUrl: "http://localhost:8080"}), null)
        assert.equal(calls[0].url.origin, "http://localhost:8080")
    })

    it("Does not load the Infisical connection from env", function () {
        process.env.SMU_INFISICAL_CLIENT_SECRET = "client-secret"
        process.env.SMU_INFISICALTEST = "yes"
        setmeup.loadFromEnv()
        delete process.env.SMU_INFISICAL_CLIENT_SECRET
        delete process.env.SMU_INFISICALTEST

        assert.equal(setmeup.settings.INFISICALTEST, "yes")
        assert.equal(setmeup.settings.infisical, undefined)
        assert.equal(setmeup.settings.INFISICAL, undefined)
    })

    it("Fails when Infisical rejects the request", async function () {
        mockFetch(new Response("Forbidden", {status: 403}))
        await assert.rejects(setmeup.loadFromInfisical(connection), /Infisical GET \/api\/v4\/secrets failed: 403/)
    })
})
