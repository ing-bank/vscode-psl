import * as path from 'path';
import { Declaration, DeclarationRule, Diagnostic, DocumentRule, Member, MemberRule, Method, MethodRule, Parameter, ParameterRule, Property, PropertyRule, PslDocument } from './api';

/**
 * Import rules here.
 */
import { MethodDocumentation, MethodSeparator } from './methodDoc';
import { MethodParametersOnNewLine } from './parameters';
import { TodoInfo } from './todos';
import { MemberLiteralCase, MemberCamelCase, MemberLength, MemberStartsWithV, PropertyIsDummy } from './elementsConventionChecker';
import { match, getConfig } from './config';
import { RuntimeStart } from './runtime';

/**
 * Add new rules here to have them checked at the appropriate time.
 */
function addRules(subscription: RuleSubscription) {

	subscription.addDocumentRules(
		new TodoInfo(),
	)

	subscription.addMemberRules(
		new MemberCamelCase(),
		new MemberLength(),
		new MemberStartsWithV(),
		new MemberLiteralCase(),
	)

	subscription.addMethodRules(
		new MethodDocumentation(),
		new MethodSeparator(),
		new MethodParametersOnNewLine(),
		new RuntimeStart(),
		// new MethodStartsWithZ(),
	)

	subscription.addPropertyRules(
		new PropertyIsDummy(),
		// new PropertyStartsWithZ(),
	)

}

export function reportRules(subscription: RuleSubscription) {

	subscription.reportDocumentRules();

	for (const property of subscription.pslDocument.parsedDocument.properties) {
		subscription.reportPropertyRules(property);
		subscription.reportMemberRules(property);
	}

	for (const declaration of subscription.pslDocument.parsedDocument.declarations) {
		subscription.reportDeclarationRules(declaration);
		subscription.reportMemberRules(declaration);
	}

	for (const method of subscription.pslDocument.parsedDocument.methods) {
		subscription.reportMethodRules(method);
		subscription.reportMemberRules(method);

		for (const parameter of method.parameters) {
			subscription.reportParameterRules(parameter, method);
			subscription.reportMemberRules(parameter);
		}

		for (const declaration of method.declarations) {
			subscription.reportDeclarationRules(declaration, method);
			subscription.reportMemberRules(declaration);
		}
	}
}

export function getDiagnostics(pslDocument: PslDocument, useConfig?: boolean) {
	let ruleSubscriptions = new RuleSubscription(pslDocument, useConfig);

	addRules(ruleSubscriptions);
	reportRules(ruleSubscriptions);

	return ruleSubscriptions.diagnostics;
}

/**
 * Interface for adding and executing rules.
 */
export class RuleSubscription {

	pslDocument: PslDocument;

	diagnostics: Diagnostic[];

	/**
	 * Generic rules.
	 */
	private documentRules: DocumentRule[];

	/**
	 * Rules that apply to any single member.
	 */
	private memberRules: MemberRule[];

	/**
	 * Rules that only apply to a single property.
	 */
	private propertyRules: PropertyRule[];

	/**
	 * Rules that only apply to a single method (and their declarations and parameters).
	 */
	private methodRules: MethodRule[];

	/**
	 * Rules that only apply to a single parameter.
	 */
	private parameterRules: ParameterRule[];

	/**
	 * Rules that only apply to a single declaration.
	 */
	private declarationRules: DeclarationRule[];

	private useConfig: boolean | undefined;

	constructor(pslDocument: PslDocument, useConfig?: boolean) {
		this.pslDocument = pslDocument;
		this.diagnostics = [];
		this.documentRules = [];
		this.memberRules = [];
		this.propertyRules = [];
		this.methodRules = [];
		this.parameterRules = [];
		this.declarationRules = [];
		if (useConfig) this.useConfig = useConfig;
	}


	addDocumentRules(...documentRules: DocumentRule[]) {
		this.documentRules = this.documentRules.concat(documentRules);
	}
	addMemberRules(...memberRules: MemberRule[]) {
		this.memberRules = this.memberRules.concat(memberRules);
	}
	addPropertyRules(...propertyRules: PropertyRule[]) {
		this.propertyRules = this.propertyRules.concat(propertyRules);
	}
	addMethodRules(...methodRules: MethodRule[]) {
		this.methodRules = this.methodRules.concat(methodRules);
	}
	addParameterRules(...parameterRules: ParameterRule[]) {
		this.parameterRules = this.parameterRules.concat(parameterRules);
	}
	addDeclarationRules(...declarationRules: DeclarationRule[]) {
		this.declarationRules = this.declarationRules.concat(declarationRules);
	}

	reportDocumentRules() {
		this.documentRules.filter(rule => this.checkConfig(rule)).forEach(rule => { this.diagnostics = this.diagnostics.concat(rule.report(this.pslDocument)) });
	}
	reportMemberRules(member: Member) {
		this.memberRules.filter(rule => this.checkConfig(rule)).forEach(memberRule => { this.diagnostics = this.diagnostics.concat(memberRule.report(this.pslDocument, member)) });
	}
	reportPropertyRules(property: Property) {
		this.propertyRules.filter(rule => this.checkConfig(rule)).forEach(propertyRule => { this.diagnostics = this.diagnostics.concat(propertyRule.report(this.pslDocument, property)) });
	}
	reportMethodRules(method: Method) {
		this.methodRules.filter(rule => this.checkConfig(rule)).forEach(methodRule => { this.diagnostics = this.diagnostics.concat(methodRule.report(this.pslDocument, method)) })
	}
	reportParameterRules(parameter: Parameter, method: Method) {
		this.parameterRules.filter(rule => this.checkConfig(rule)).forEach(parameterRule => { this.diagnostics = this.diagnostics.concat(parameterRule.report(this.pslDocument, parameter, method)) })
	}
	reportDeclarationRules(declaration: Declaration, method?: Method) {
		this.declarationRules.filter(rule => this.checkConfig(rule)).forEach(declarationRule => { this.diagnostics = this.diagnostics.concat(declarationRule.report(this.pslDocument, declaration, method)) })
	}

	checkConfig(rule: DocumentRule): boolean {
		if (!this.useConfig) return true;
		const config = getConfig(this.pslDocument.fsPath);
		return match(path.basename(this.pslDocument.fsPath), rule.ruleName, config);
	}
}
