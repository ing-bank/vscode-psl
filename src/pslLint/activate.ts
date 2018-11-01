import * as path from 'path';
import {
	DeclarationRule, Diagnostic, DocumentRule, MemberRule, MethodRule, ParameterRule, PropertyRule, PslDocument,
} from './api';
import { getConfig, matchConfig } from './config';

/**
 * Import rules here.
 */
import { MemberCamelCase, MemberLength, MemberLiteralCase, MemberStartsWithV } from './elementsConventionChecker';
import { MethodDocumentation, MethodSeparator, TwoEmptyLines } from './methodDoc';
import { MultiLineDeclare } from './multiLineDeclare';
import { MethodParametersOnNewLine } from './parameters';
import { RuntimeStart } from './runtime';
import { TodoInfo } from './todos';

/**
 * Add new rules here to have them checked at the appropriate time.
 */
const documentRules: DocumentRule[] = [
	new TodoInfo(),
];
const memberRules: MemberRule[] = [
	new MemberCamelCase(),
	new MemberLength(),
	new MemberStartsWithV(),
	new MemberLiteralCase(),
];
const methodRules: MethodRule[] = [
	new MethodDocumentation(),
	new MethodSeparator(),
	new MethodParametersOnNewLine(),
	new RuntimeStart(),
	new MultiLineDeclare(),
	new TwoEmptyLines(),
];
const propertyRules: PropertyRule[] = [];
const declarationRules: DeclarationRule[] = [];
const parameterRules: ParameterRule[] = [];

export function getDiagnostics(pslDocument: PslDocument, useConfig?: boolean): Diagnostic[] {
	const subscription = new RuleSubscription(pslDocument, useConfig);
	return subscription.reportRules();
}

/**
 * Interface for adding and executing rules.
 */
class RuleSubscription {

	private diagnostics: Diagnostic[];
	private filteredDocumentRules: DocumentRule[];
	private filteredMethodRules: MethodRule[];
	private filteredMemberRules: MemberRule[];
	private filteredPropertyRules: PropertyRule[];
	private filteredDeclarationRules: DeclarationRule[];
	private filteredParameterRules: ParameterRule[];

	constructor(private pslDocument: PslDocument, useConfig?: boolean) {
		this.diagnostics = [];

		const config = useConfig ? getConfig(this.pslDocument.fsPath) : undefined;

		const filterRules = (rules: DocumentRule[]) => {
			return rules.filter(rule => {
				if (!config) return true;
				return matchConfig(path.basename(this.pslDocument.fsPath), rule.ruleName, config);
			});
		};

		this.filteredDocumentRules = filterRules(documentRules);
		this.filteredMethodRules = filterRules(methodRules);
		this.filteredMemberRules = filterRules(memberRules);
		this.filteredPropertyRules = filterRules(propertyRules);
		this.filteredDeclarationRules = filterRules(declarationRules);
		this.filteredParameterRules = filterRules(parameterRules);
	}

	reportRules(): Diagnostic[] {
		const addDiagnostics = (rules: DocumentRule[], ...args: any[]) => {
			rules.forEach(rule => this.diagnostics.push(...rule.report(this.pslDocument, ...args)));
		};

		addDiagnostics(this.filteredDocumentRules);

		for (const property of this.pslDocument.parsedDocument.properties) {
			addDiagnostics(this.filteredMemberRules, property);
			addDiagnostics(this.filteredPropertyRules, property);
		}

		for (const declaration of this.pslDocument.parsedDocument.declarations) {
			addDiagnostics(this.filteredMemberRules, declaration);
			addDiagnostics(this.filteredDeclarationRules, declaration);
		}

		for (const method of this.pslDocument.parsedDocument.methods) {
			addDiagnostics(this.filteredMemberRules, method);
			addDiagnostics(this.filteredMethodRules, method);

			for (const parameter of method.parameters) {
				addDiagnostics(this.filteredMemberRules, parameter);
				addDiagnostics(this.filteredParameterRules, parameter, method);
			}

			for (const declaration of method.declarations) {
				addDiagnostics(this.filteredMemberRules, declaration);
				addDiagnostics(this.filteredDeclarationRules, declaration, method);
			}
		}
		return this.diagnostics;
	}
}
